import { vi } from 'vitest';

const FEATURES_TS_TEMPLATE = `import type { FeatureConfig } from './common/interfaces';

export const features: FeatureConfig[] = [];
`;

export function setupFetchMock() {
  global.fetch = vi.fn(async (url: string | URL | Request) => {
    const urlStr = url.toString();
    if (urlStr.includes('raw.githubusercontent.com')) {
      if (urlStr.endsWith('features.ts')) {
        return { ok: true, text: async () => FEATURES_TS_TEMPLATE } as Response;
      }
      const path = urlStr.split('/lib/')[1] ?? '';
      return { ok: true, text: async () => `// mock: ${path}\n` } as Response;
    }
    return { ok: false, statusText: 'Not Found' } as Response;
  }) as typeof fetch;
}
