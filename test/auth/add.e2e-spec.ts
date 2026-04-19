import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRegistry } from './helpers/mock-registry';
import { createTempProject, type TestProject } from './helpers/setup';

const FEATURES_TS_TEMPLATE = `import type { FeatureConfig } from './common/interfaces';

export const features: FeatureConfig[] = [];
`;

const INITIAL_FEATURES_TS = `import type { FeatureConfig } from './common/interfaces';
import { coreFeature } from './features/core/core.feature';

export const features: FeatureConfig[] = [
  coreFeature(),
];
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
    return { ok: true, text: async () => FEATURES_TS_TEMPLATE } as Response;
  }
  if (urlStr.includes('raw.githubusercontent.com')) {
    const path = urlStr.split('/lib/')[1] ?? '';
    return { ok: true, text: async () => `// mock: ${path}\n` } as Response;
  }
  return { ok: false, statusText: 'Not Found' } as Response;
}) as typeof fetch;

import { authAdd } from '../../src/commands/auth/add';
import { authInit } from '../../src/commands/auth/init';

describe('auth add (e2e)', () => {
  let project: TestProject;
  let brkptAuthDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    project = createTempProject();
    process.chdir(project.dir);
    await authInit();
    brkptAuthDir = join(project.dir, 'src/brkpt-auth');
    writeFileSync(join(brkptAuthDir, 'features.ts'), INITIAL_FEATURES_TS);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    project.cleanup();
  });

  it('should install credentials feature', async () => {
    await authAdd('credentials', {});
    expect(
      existsSync(
        join(brkptAuthDir, 'features/credentials/credentials.service.ts'),
      ),
    ).toBe(true);
  });

  it('should update features.ts', async () => {
    await authAdd('credentials', {});
    const content = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    expect(content).toContain('import { credentialsFeature }');
    expect(content).toContain('credentialsFeature()');
  });

  it('should skip already installed feature', async () => {
    await authAdd('credentials', {});
    const before = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    await authAdd('credentials', {});
    const after = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    expect(before).toBe(after);
  });

  it('should exit on unknown feature', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as any);
    await expect(authAdd('unknown', {})).rejects.toThrow();
    exitSpy.mockRestore();
  });

  it('should show select when no feature provided', async () => {
    const ui = await import('../../src/utils/ui');
    vi.spyOn(ui, 'selectFeature').mockResolvedValueOnce('credentials');
    await authAdd(undefined, {});
    expect(existsSync(join(brkptAuthDir, 'features/credentials'))).toBe(true);
  });

  it('should install verifier via --verifier', async () => {
    await authAdd('oauth', { verifier: 'google' });
    expect(
      existsSync(
        join(brkptAuthDir, 'features/oauth/verifiers/google.verifier.ts'),
      ),
    ).toBe(true);
  });

  it('should install multiple verifiers via comma-separated --verifier', async () => {
    await authAdd('oauth', { verifier: 'google,github' });
    expect(
      existsSync(
        join(brkptAuthDir, 'features/oauth/verifiers/google.verifier.ts'),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(brkptAuthDir, 'features/oauth/verifiers/github.verifier.ts'),
      ),
    ).toBe(true);
  });

  it('should skip already installed verifier', async () => {
    await authAdd('oauth', { verifier: 'google' });
    const before = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    await authAdd('oauth', { verifier: 'google' });
    const after = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    expect(before).toBe(after);
  });

  it('should exit on unknown verifier', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as any);
    await expect(authAdd('oauth', { verifier: 'unknown' })).rejects.toThrow();
    exitSpy.mockRestore();
  });

  it('should install verify-email extra decorator file', async () => {
    await authAdd('verify-email', {});
    expect(
      existsSync(
        join(brkptAuthDir, 'common/decorators/skip-verify-email.decorator.ts'),
      ),
    ).toBe(true);
  });

  it('should ensure blacklist comes after core', async () => {
    await authAdd('blacklist', {});
    const content = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    expect(content.indexOf('coreFeature()')).toBeLessThan(
      content.indexOf('blacklistFeature()'),
    );
  });

  it('should ensure verify-email comes after blacklist', async () => {
    await authAdd('blacklist', {});
    await authAdd('verify-email', {});
    const content = readFileSync(join(brkptAuthDir, 'features.ts'), 'utf-8');
    expect(content.indexOf('blacklistFeature()')).toBeLessThan(
      content.indexOf('verifyEmailFeature()'),
    );
  });

  it('should exit when brkpt-auth not initialized', async () => {
    project.cleanup();
    project = createTempProject();
    process.chdir(project.dir);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as any);
    await expect(authAdd('credentials', {})).rejects.toThrow();
    exitSpy.mockRestore();
  });
});
