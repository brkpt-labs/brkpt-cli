import { existsSync } from 'fs';
import { join, relative } from 'path';
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
  exitWithError,
  hi,
  intro,
  outro,
  printDepsWarning,
  showNote,
  title,
  warn,
} from '../../utils/ui';

export async function authInit() {
  const cwd = process.cwd();

  intro(title('brkpt auth init'));

  // 1. 检测项目结构
  const project = detectProject(cwd);

  if (!project.hasNestCli) {
    warn(
      `nest-cli.json not found — assuming source root: ${hi(project.sourceRoot || '(root)')}`,
    );
  }

  const brkptAuthDir = join(cwd, project.sourceRoot, 'brkpt-auth');

  if (existsSync(brkptAuthDir)) {
    exitWithError(
      `brkpt-auth already exists at ${hi(relative(cwd, brkptAuthDir))}`,
    );
  }

  // 2. 确认安装路径
  const confirmed = await confirm(
    `Install brkpt-auth to ${hi(relative(cwd, brkptAuthDir))}?`,
  );
  if (!confirmed) process.exit(0);

  const s = createSpinner();

  // 3. 拉取 registry
  s.start('Fetching registry...');
  let registry;
  try {
    registry = await getRegistry();
    s.stop('Registry fetched.');
  } catch (err) {
    s.error('Failed to fetch registry.');
    exitWithError(String(err));
  }

  const core =
    registry.features['core'] ??
    exitWithError('Registry is missing core feature.');

  // 4. 下载文件
  try {
    await pull(registry.baseUrl, registry.common, brkptAuthDir, 'common', s);
    await pull(registry.baseUrl, core.files, brkptAuthDir, 'core', s);
    await pull(registry.baseUrl, registry.module, brkptAuthDir, 'module', s);
    await pull(
      registry.baseUrl,
      registry.featuresTemplate,
      brkptAuthDir,
      'features template',
      s,
    );
  } catch (err) {
    exitWithError(String(err));
  }

  // 5. 更新 features.ts
  s.start('Updating features.ts...');
  updateFeaturesTs(join(brkptAuthDir, 'features.ts'), 'core');
  s.stop('features.ts updated.');

  // 6. 依赖检查
  const pm = detectPackageManager(cwd);
  const pmInstall = (pkgs: string[], dev = false) =>
    installCommand(pm, pkgs, dev);

  const { missing, missingDev } = checkDeps(
    cwd,
    [...registry.commonDependencies.dependencies, ...core.dependencies],
    [...registry.commonDependencies.devDependencies, ...core.devDependencies],
  );
  printDepsWarning(missing, missingDev, pmInstall);

  showNote(
    [
      `1. Register in your AppModule:`,
      `   ${cmd('EventEmitterModule.forRoot({ isGlobal: true, wildcard: true })')}`,
      `   ${cmd('BrkptAuthModule.forRoot({ ... })')}`,
      ``,
      `2. Implement your adapters and register them in ${cmd('features.ts')}`,
      ``,
      `3. Check ${cmd('BrkptAuthModule')} for any required imports or providers if needed`,
      ``,
      `4. Check DTOs and add validation if needed`,
      ``,
      `5. Add more features with ${cmd('brkpt auth add')}`,
    ],
    'Next steps',
  );

  outro('Done.');
}
