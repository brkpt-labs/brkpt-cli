import {
  confirm as clackConfirm,
  intro as clackIntro,
  isCancel,
  log,
  note,
  outro as clackOutro,
  select,
  spinner,
  multiselect,
} from '@clack/prompts';
import pc from 'picocolors';

export const cmd = (text: string) => pc.cyan(text);
export const hi = (text: string) => pc.cyan(text);
export const dim = (text: string) => pc.dim(text);
export const title = (text: string) => pc.bgCyan(pc.black(` ${text} `));

export const intro = (text: string) => clackIntro(text);
export const outro = (text: string) => clackOutro(text);

export const warn = (text: string) => log.warn(text);
export const info = (text: string) => log.info(text);

export function createSpinner() {
  return spinner();
}

export function showNote(lines: string[], heading?: string) {
  note(lines.join('\n'), heading);
}

export async function confirm(msg: string): Promise<boolean> {
  const result = await clackConfirm({ message: msg });
  if (isCancel(result)) process.exit(0);
  return result as boolean;
}

export async function selectFeature(available: string[]): Promise<string> {
  const result = await select({
    message: 'Select a feature to add:',
    options: available.map((f) => ({ value: f, label: f })),
  });
  if (isCancel(result)) process.exit(0);
  return result as string;
}

export async function selectVerifiers(
  featureName: string,
  available: string[],
): Promise<string[]> {
  const result = await multiselect({
    message: `Select verifiers for ${cmd(featureName)}:`,
    options: [...available.map((v) => ({ value: v, label: v }))],
    required: false,
  });
  if (isCancel(result)) process.exit(0);
  return result as string[];
}

export function printDepsWarning(
  missing: string[],
  missingDev: string[],
  installCommand: (packages: string[], dev?: boolean) => string,
) {
  if (missing.length === 0 && missingDev.length === 0) return;
  const lines: string[] = [];
  if (missing.length > 0) lines.push(installCommand(missing));
  if (missingDev.length > 0) lines.push(installCommand(missingDev, true));
  log.warn(
    `Missing dependencies detected. Please install:\n\n` +
      lines.map((l) => `  ${l}`).join('\n'),
  );
}

export function exitWithError(msg: string): never {
  log.error(msg);
  process.exit(1);
}
