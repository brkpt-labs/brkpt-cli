import { existsSync } from 'fs';
import { join } from 'path';

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function installCommand(
  pm: PackageManager,
  packages: string[],
  dev = false,
): string {
  const flag = dev ? (pm === 'npm' ? '--save-dev' : '-D') : '';
  const pkgs = packages.join(' ');
  switch (pm) {
    case 'pnpm':
      return `pnpm add ${flag} ${pkgs}`.trim();
    case 'yarn':
      return `yarn add ${flag} ${pkgs}`.trim();
    case 'npm':
      return `npm install ${flag} ${pkgs}`.trim();
  }
}
