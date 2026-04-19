import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockRegistry } from './helpers/mock-registry';
import { createTempProject, type TestProject } from './helpers/setup';

const FEATURES_TS = `import type { FeatureConfig } from './common/interfaces';

export const features: FeatureConfig[] = [];
`;

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn(),
  multiselect: vi.fn().mockResolvedValue([]),
  spinner: vi
    .fn()
    .mockReturnValue({ start: vi.fn(), stop: vi.fn(), error: vi.fn() }),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('@auth/utils/registry-cache', () => ({
  getRegistry: vi.fn().mockResolvedValue(mockRegistry),
  resetRegistry: vi.fn(),
}));

global.fetch = vi.fn(async (url: string | URL | Request) => {
  const urlStr = url.toString();
  if (urlStr.endsWith('features.ts')) {
    return { ok: true, text: async () => FEATURES_TS } as Response;
  }
  if (urlStr.includes('raw.githubusercontent.com')) {
    const path = urlStr.split('/lib/')[1] ?? '';
    return { ok: true, text: async () => `// mock: ${path}\n` } as Response;
  }
  return { ok: false, statusText: 'Not Found' } as Response;
}) as typeof fetch;

import { authInit } from '../../src/commands/auth/init';

describe('auth init (e2e)', () => {
  let project: TestProject;
  const originalCwd = process.cwd();

  beforeEach(() => {
    project = createTempProject();
    process.chdir(project.dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    project.cleanup();
    vi.clearAllMocks();
  });

  it('should create brkpt-auth directory', async () => {
    await authInit();
    expect(existsSync(join(project.dir, 'src/brkpt-auth'))).toBe(true);
  });

  it('should download common files', async () => {
    await authInit();
    expect(
      existsSync(join(project.dir, 'src/brkpt-auth/common/constants/index.ts')),
    ).toBe(true);
  });

  it('should download core feature files', async () => {
    await authInit();
    expect(
      existsSync(
        join(project.dir, 'src/brkpt-auth/features/core/core.service.ts'),
      ),
    ).toBe(true);
  });

  it('should download brkpt-auth.module.ts', async () => {
    await authInit();
    expect(
      existsSync(join(project.dir, 'src/brkpt-auth/brkpt-auth.module.ts')),
    ).toBe(true);
  });

  it('should generate features.ts with core registered', async () => {
    await authInit();
    const content = readFileSync(
      join(project.dir, 'src/brkpt-auth/features.ts'),
      'utf-8',
    );
    expect(content).toContain('import { coreFeature }');
    expect(content).toContain('coreFeature()');
  });

  it('should exit when brkpt-auth already exists', async () => {
    await authInit();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as any);
    await expect(authInit()).rejects.toThrow();
    exitSpy.mockRestore();
  });

  it('should exit when user cancels', async () => {
    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false as any);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as any);
    await expect(authInit()).rejects.toThrow();
    exitSpy.mockRestore();
  });

  it('should work without nest-cli.json', async () => {
    project.cleanup();
    project = createTempProject(false);
    process.chdir(project.dir);
    await authInit();
    expect(existsSync(join(project.dir, 'src/brkpt-auth'))).toBe(true);
  });
});
