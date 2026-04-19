import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectInfo {
  root: string;
  sourceRoot: string;
  hasNestCli: boolean;
}

export function detectProject(cwd: string): ProjectInfo {
  const nestCliPath = join(cwd, 'nest-cli.json');

  if (!existsSync(nestCliPath)) {
    return {
      root: cwd,
      sourceRoot: existsSync(join(cwd, 'src')) ? 'src' : '',
      hasNestCli: false,
    };
  }

  const nestCli = JSON.parse(readFileSync(nestCliPath, 'utf-8')) as {
    sourceRoot?: string;
  };

  return {
    root: cwd,
    sourceRoot: nestCli.sourceRoot ?? 'src',
    hasNestCli: true,
  };
}
