import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const REGISTRY_URL =
  'https://raw.githubusercontent.com/brkpt-labs/brkpt-auth/main/lib/registry.json';

export interface VerifierConfig {
  files: string[];
  dependencies: string[];
  devDependencies: string[];
}

export interface FeatureConfig {
  files: string[];
  extraFiles?: string[];
  dependencies: string[];
  devDependencies: string[];
  verifiers?: Record<string, VerifierConfig>;
}

export interface Registry {
  version: string;
  baseUrl: string;
  common: string[];
  commonDependencies: {
    dependencies: string[];
    devDependencies: string[];
  };
  module: string;
  featuresTemplate: string;
  features: Record<string, FeatureConfig>;
}

export async function fetchRegistry(): Promise<Registry> {
  const res = await fetch(REGISTRY_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch registry (${res.status} ${res.statusText})`,
    );
  }
  return res.json() as Promise<Registry>;
}

export async function fetchFileContent(
  baseUrl: string,
  filePath: string,
): Promise<string> {
  const url = `${baseUrl}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${filePath} (${res.status} ${res.statusText})`,
    );
  }
  return res.text();
}

export async function downloadFile(
  baseUrl: string,
  filePath: string,
  destDir: string,
): Promise<void> {
  const content = await fetchFileContent(baseUrl, filePath);
  const destPath = join(destDir, filePath);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content, 'utf-8');
}

export async function pull(
  baseUrl: string,
  files: string | string[],
  destDir: string,
  label: string,
  s: ReturnType<typeof import('@clack/prompts').spinner>,
): Promise<void> {
  s.start(`Downloading ${label}...`);
  try {
    const list = Array.isArray(files) ? files : [files];
    await Promise.all(list.map((f) => downloadFile(baseUrl, f, destDir)));
    s.stop(`${label} downloaded.`);
  } catch (err) {
    s.stop(`Failed to download ${label}.`);
    throw err;
  }
}
