import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface TestProject {
  dir: string;
  cleanup: () => void;
}

export function createTempProject(withNestCli = true): TestProject {
  const dir = join(
    tmpdir(),
    `brkpt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'src'), { recursive: true });

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-project',
        dependencies: {
          '@nestjs/common': '^11.0.0',
          '@nestjs/core': '^11.0.0',
          '@nestjs/event-emitter': '^3.0.0',
          '@nestjs/jwt': '^11.0.0',
          ms: '^2.1.3',
        },
        devDependencies: {
          '@types/ms': '^2.1.0',
        },
      },
      null,
      2,
    ),
  );

  if (withNestCli) {
    writeFileSync(
      join(dir, 'nest-cli.json'),
      JSON.stringify({ sourceRoot: 'src' }, null, 2),
    );
  }

  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
