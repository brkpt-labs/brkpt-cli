import { readFileSync, writeFileSync } from 'fs';
import { log } from '@clack/prompts';

const GUARD_ORDER = ['core', 'blacklist', 'verify-email'];

export function updateFeaturesTs(
  featuresPath: string,
  featureName: string,
): void {
  let content = readFileSync(featuresPath, 'utf-8');

  const camel = toCamelCase(featureName);
  const importName = `${camel}Feature`;
  const importPath = `./features/${featureName}/${featureName}.feature`;
  const importLine = `import { ${importName} } from '${importPath}';`;

  if (content.includes(importLine)) return;

  content = content.replace(
    /(import[\s\S]*?;\n)(\n*export)/,
    `$1${importLine}\n$2`,
  );

  content = content.replace(
    /(\bfeatures:\s*FeatureConfig\[\]\s*=\s*\[)([\s\S]*?)(\];)/,
    (_, open, inner, close) => {
      const lines = inner
        .split('\n')
        .map((l: string) => l.trimEnd())
        .filter((l: string) => l.trim().length > 0)
        .map((l: string) => {
          const trimmed = l.trim();
          if (trimmed.match(/\w+Feature\s*\(.*\)$/) && !trimmed.endsWith(',')) {
            return '  ' + trimmed + ',';
          }
          return l;
        });

      lines.push(`  ${importName}(),`);

      const { sorted, changed } = sortFeatureCalls(lines);

      if (changed) {
        log.warn(
          `features.ts was automatically reordered to ensure correct guard registration sequence.`,
        );
      }

      return `${open}\n${sorted.join('\n')}\n${close}`;
    },
  );

  writeFileSync(featuresPath, content, 'utf-8');
}

function sortFeatureCalls(lines: string[]): {
  sorted: string[];
  changed: boolean;
} {
  const getGuardIndex = (line: string): number => {
    const match = line.trim().match(/^(\w+)Feature\s*\(/);
    if (!match?.[1]) return GUARD_ORDER.length;
    const kebab = toKebabCase(match[1]);
    const idx = GUARD_ORDER.indexOf(kebab);
    return idx === -1 ? GUARD_ORDER.length : idx;
  };

  const indexed = lines.map((line, i) => ({
    line,
    i,
    order: getGuardIndex(line),
  }));
  indexed.sort((a, b) => a.order - b.order || a.i - b.i);

  const sorted = indexed.map((x) => x.line);
  const changed = sorted.some((v, i) => v !== lines[i]);

  return { sorted, changed };
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, l: string) => l.toUpperCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
