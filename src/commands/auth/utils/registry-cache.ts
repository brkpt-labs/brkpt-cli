import { fetchRegistry, type Registry } from './fetch-registry';

let cached: Registry | null = null;

export async function getRegistry(): Promise<Registry> {
  if (cached) return cached;
  cached = await fetchRegistry();
  return cached;
}

export function resetRegistry(): void {
  cached = null;
}
