import { existsSync } from 'fs';
import { join } from 'path';
import { checkDeps } from '../../utils/check-deps';
import { detectPackageManager, installCommand } from '../../utils/detect-pm';
import { detectProject } from '../../utils/detect-project';
import { pull } from './utils/fetch-registry';
import { updateFeaturesTs } from './utils/features-ts';
import { getRegistry } from './utils/registry-cache';
import {
  cmd,
  confirm,
  createSpinner,
  dim,
  exitWithError,
  intro,
  outro,
  printDepsWarning,
  selectFeature,
  selectVerifiers,
  showNote,
  title,
  warn,
} from '../../utils/ui';

interface AddOptions {
  verifier?: string;
}

export async function authAdd(
  featureName: string | undefined,
  options: AddOptions,
) {
  const cwd = process.cwd();

  intro(title('brkpt auth add'));

  // 1. 检测项目结构
  const project = detectProject(cwd);
  const brkptAuthDir = join(cwd, project.sourceRoot, 'brkpt-auth');
  const featuresPath = join(brkptAuthDir, 'features.ts');

  if (!existsSync(brkptAuthDir)) {
    exitWithError(`brkpt-auth not found. Run ${cmd('brkpt auth init')} first.`);
  }

  const s = createSpinner();

  // 2. 拉取 registry
  s.start('Fetching registry...');
  let registry;
  try {
    registry = await getRegistry();
    s.stop('Registry fetched.');
  } catch (err) {
    s.stop('Failed to fetch registry.');
    exitWithError(String(err));
  }

  const availableFeatures = Object.keys(registry.features);

  // 3. 确定 feature
  let name: string;

  if (!featureName) {
    name = await selectFeature(availableFeatures);
  } else {
    if (!availableFeatures.includes(featureName)) {
      exitWithError(
        `Unknown feature: ${cmd(featureName)}\n\n` +
          `  Available: ${cmd(availableFeatures.join(', '))}`,
      );
    }
    name = featureName;
  }

  const feature = registry.features[name]!;
  const featureDir = join(brkptAuthDir, 'features', name);
  const featureExists = existsSync(featureDir);
  const availableVerifiers = Object.keys(feature.verifiers ?? {});

  // 4. 确定 verifiers
  let selectedVerifiers: string[] = [];

  if (options.verifier) {
    selectedVerifiers = options.verifier
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const invalid = selectedVerifiers.filter(
      (v) => !availableVerifiers.includes(v),
    );
    if (invalid.length > 0) {
      exitWithError(
        availableVerifiers.length > 0
          ? `Unknown verifier${invalid.length > 1 ? 's' : ''}: ${invalid.map(cmd).join(', ')}\n\n  Available: ${cmd(availableVerifiers.join(', '))}`
          : `${cmd(name)} has no verifiers.`,
      );
    }
  } else if (availableVerifiers.length > 0) {
    selectedVerifiers = await selectVerifiers(name, availableVerifiers);
  }

  // 5. 检查各 verifier 存在性
  const verifiersToInstall = selectedVerifiers.filter((v) => {
    const vc = feature.verifiers![v]!;
    const verifierFile = join(brkptAuthDir, vc.files[0] ?? '');
    return !existsSync(verifierFile);
  });

  const alreadyInstalledVerifiers = selectedVerifiers.filter((v) => {
    const vc = feature.verifiers![v]!;
    const verifierFile = join(brkptAuthDir, vc.files[0] ?? '');
    return existsSync(verifierFile);
  });

  // 6. 检查是否有任何东西需要安装
  if (featureExists && verifiersToInstall.length === 0) {
    if (alreadyInstalledVerifiers.length > 0) {
      alreadyInstalledVerifiers.forEach((v) =>
        warn(`${name}/${v} verifier already installed.`),
      );
    } else {
      warn(`${name} already installed.`);
    }
    outro('Nothing to install.');
    return;
  }

  // 7. 展示安装计划
  const planLines: string[] = [];

  if (!featureExists) {
    planLines.push(`${cmd(name)} feature`);
  }

  verifiersToInstall.forEach((v) =>
    planLines.push(`${cmd(name + '/' + v)} verifier`),
  );

  alreadyInstalledVerifiers.forEach((v) =>
    planLines.push(
      `${cmd(name + '/' + v)} verifier ${dim('(already installed, skip)')}`,
    ),
  );

  showNote(planLines, 'Installation plan');

  const confirmed = await confirm('Proceed?');
  if (!confirmed) process.exit(0);

  // 8. 安装 feature
  let installedFeature = false;
  let installedVerifier = false;

  if (!featureExists) {
    try {
      await pull(registry.baseUrl, feature.files, brkptAuthDir, name, s);
      if (feature.extraFiles?.length) {
        await pull(
          registry.baseUrl,
          feature.extraFiles,
          brkptAuthDir,
          `${name} extras`,
          s,
        );
      }
      installedFeature = true;
    } catch (err) {
      exitWithError(String(err));
    }

    if (existsSync(featuresPath)) {
      s.start('Updating features.ts...');
      s.stop('features.ts updated.');
      updateFeaturesTs(featuresPath, name);
    }
  }

  // 9. 安装 verifiers
  const allDeps: string[] = installedFeature ? [...feature.dependencies] : [];
  const allDevDeps: string[] = installedFeature
    ? [...feature.devDependencies]
    : [];

  for (const v of verifiersToInstall) {
    const vc = feature.verifiers![v]!;
    try {
      await pull(
        registry.baseUrl,
        vc.files,
        brkptAuthDir,
        `${name}/${v} verifier`,
        s,
      );
      installedVerifier = true;
      allDeps.push(...vc.dependencies);
      allDevDeps.push(...vc.devDependencies);
    } catch (err) {
      exitWithError(String(err));
    }
  }

  // 10. 依赖检查
  const pm = detectPackageManager(cwd);
  const pmInstall = (pkgs: string[], dev = false) =>
    installCommand(pm, pkgs, dev);
  const { missing, missingDev } = checkDeps(cwd, allDeps, allDevDeps);
  printDepsWarning(missing, missingDev, pmInstall);

  // 11. next steps
  if (installedFeature) {
    showNote(
      [
        `1. Implement your adapter and register it in ${cmd('features.ts')}`,
        ``,
        `2. Check ${cmd('BrkptAuthModule')} for any required imports or providers if needed`,
        ``,
        `3. Check DTOs and add validation if needed`,
      ],
      'Next steps',
    );
  }

  outro('Done.');
}
