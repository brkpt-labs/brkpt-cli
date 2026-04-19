import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface DepsResult {
  missing: string[];
  missingDev: string[];
}

export function checkDeps(
  cwd: string,
  deps: string[] = [],
  devDeps: string[] = [],
): DepsResult {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    return { missing: deps, missingDev: devDeps };
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const installed = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  return {
    missing: deps.filter((d) => !installed.has(d)),
    missingDev: devDeps.filter((d) => !installed.has(d)),
  };
}
