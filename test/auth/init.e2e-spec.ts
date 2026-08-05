import { existsSync, readFileSync, rmSync } from 'fs';
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

  it('should restore common files with --common', async () => {
    await authInit();

    const commonDir = join(project.dir, 'src/brkpt-auth/common');
    rmSync(commonDir, { recursive: true, force: true });

    vi.mocked(global.fetch).mockClear();

    await authInit({ common: true });

    expect(existsSync(join(commonDir, 'constants/index.ts'))).toBe(true);

    const requestedUrls = vi
      .mocked(global.fetch)
      .mock.calls.map(([url]) => url.toString());

    expect(requestedUrls).toHaveLength(mockRegistry.common.length);

    for (const file of mockRegistry.common) {
      expect(requestedUrls).toContain(`${mockRegistry.baseUrl}/${file}`);
    }
  });

  it('should restore brkpt-auth.module.ts with --module', async () => {
    await authInit();

    const modulePath = join(project.dir, 'src/brkpt-auth/brkpt-auth.module.ts');

    rmSync(modulePath);

    vi.mocked(global.fetch).mockClear();

    await authInit({ module: true });

    expect(existsSync(modulePath)).toBe(true);

    const requestedUrls = vi
      .mocked(global.fetch)
      .mock.calls.map(([url]) => url.toString());

    expect(requestedUrls).toEqual([
      `${mockRegistry.baseUrl}/${mockRegistry.module}`,
    ]);
  });

  it('should restore common and module together', async () => {
    await authInit();

    const commonDir = join(project.dir, 'src/brkpt-auth/common');
    const modulePath = join(project.dir, 'src/brkpt-auth/brkpt-auth.module.ts');

    rmSync(commonDir, { recursive: true, force: true });
    rmSync(modulePath);

    await authInit({ common: true, module: true });

    expect(existsSync(join(commonDir, 'constants/index.ts'))).toBe(true);

    expect(existsSync(modulePath)).toBe(true);
  });

  it('should exit when restoring common that already exists', async () => {
    await authInit();

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    await expect(authInit({ common: true })).rejects.toThrow('exit');

    exitSpy.mockRestore();
  });

  it('should exit when restoring module that already exists', async () => {
    await authInit();

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    await expect(authInit({ module: true })).rejects.toThrow('exit');

    exitSpy.mockRestore();
  });

  it('should exit when using partial init before brkpt-auth is initialized', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    await expect(authInit({ common: true })).rejects.toThrow('exit');

    exitSpy.mockRestore();
  });

  it('should exit when brkpt-auth already exists', async () => {
    await authInit();

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    await expect(authInit()).rejects.toThrow('exit');

    exitSpy.mockRestore();
  });

  it('should exit when user cancels', async () => {
    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false as never);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    await expect(authInit()).rejects.toThrow('exit');

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
