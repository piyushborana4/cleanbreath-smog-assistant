import fs from 'node:fs';
import path from 'node:path';

interface ContrastPair {
  mode: 'light' | 'dark';
  label: string;
  fgToken: string;
  bgToken: string;
  kind: 'text' | 'ui';
  minRatio: number;
}

function parseHexTokens(cssContent: string): {
  theme: Record<string, string>;
  lightVars: Record<string, string>;
  darkVars: Record<string, string>;
} {
  const theme: Record<string, string> = {};
  const lightVars: Record<string, string> = {};
  const darkVars: Record<string, string> = {};

  const themeMatch = cssContent.match(/@theme\s*\{([\s\S]*?)\}/);
  const rootMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/);
  const darkMatch = cssContent.match(/\.dark\s*\{([\s\S]*?)\}/);

  const extract = (block: string | undefined, target: Record<string, string>) => {
    if (!block) return;
    const re = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
    let match: RegExpExecArray | null = re.exec(block);
    while (match) {
      const key = match[1];
      const val = match[2];
      if (key && val) target[key] = val.toLowerCase();
      match = re.exec(block);
    }
  };

  extract(themeMatch?.[1], theme);
  extract(rootMatch?.[1], lightVars);
  extract(darkMatch?.[1], darkVars);

  return { theme, lightVars, darkVars };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const PAIRS: ContrastPair[] = [
  // Light mode text pairs
  {
    mode: 'light',
    label: 'Primary text on Surface',
    fgToken: '--color-light-on-surface',
    bgToken: '--color-light-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Secondary text on Surface',
    fgToken: '--color-light-on-surface-variant',
    bgToken: '--color-light-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Primary text on Card (lowest)',
    fgToken: '--color-light-on-surface',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Secondary text on Card (low)',
    fgToken: '--color-light-on-surface-variant',
    bgToken: '--color-light-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Secondary text on Container',
    fgToken: '--color-light-on-surface-variant',
    bgToken: '--color-light-surface-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Primary brand link/text on Surface',
    fgToken: '--color-light-primary',
    bgToken: '--color-light-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Primary brand link/text on Card',
    fgToken: '--color-light-primary',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Button on-primary on Primary',
    fgToken: '--color-light-on-primary',
    bgToken: '--color-light-primary',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Badge on-secondary-container',
    fgToken: '--color-light-on-secondary-container',
    bgToken: '--color-light-secondary-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Good badge on-good-container',
    fgToken: '--color-light-on-good-container',
    bgToken: '--color-light-good-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Good status text on Surface',
    fgToken: '--color-light-good',
    bgToken: '--color-light-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Caution badge on-caution-container',
    fgToken: '--color-light-on-caution-container',
    bgToken: '--color-light-caution-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Caution text on Card (lowest)',
    fgToken: '--color-light-caution',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Error badge on-error-container',
    fgToken: '--color-light-on-error-container',
    bgToken: '--color-light-error-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'light',
    label: 'Error text on Card (low)',
    fgToken: '--color-light-error',
    bgToken: '--color-light-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  // Light mode UI / gauge non-text graphical contrast (>= 3.0)
  {
    mode: 'light',
    label: 'Input border outline on Surface',
    fgToken: '--color-light-outline',
    bgToken: '--color-light-surface',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Good arc on Card',
    fgToken: '--gauge-good',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Moderate arc on Card',
    fgToken: '--gauge-moderate',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Sensitive arc on Card',
    fgToken: '--gauge-sensitive',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Unhealthy arc on Card',
    fgToken: '--gauge-unhealthy',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Very Unhealthy arc on Card',
    fgToken: '--gauge-very-unhealthy',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'light',
    label: 'Gauge Severe arc on Card',
    fgToken: '--gauge-severe',
    bgToken: '--color-light-surface-container-lowest',
    kind: 'ui',
    minRatio: 3.0,
  },

  // Dark mode text pairs
  {
    mode: 'dark',
    label: 'Primary text on Dark Surface',
    fgToken: '--color-dark-on-surface',
    bgToken: '--color-dark-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Secondary text on Dark Surface',
    fgToken: '--color-dark-on-surface-variant',
    bgToken: '--color-dark-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Primary text on Dark Card (low)',
    fgToken: '--color-dark-on-surface',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Secondary text on Dark Card (low)',
    fgToken: '--color-dark-on-surface-variant',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Secondary text on Dark Container',
    fgToken: '--color-dark-on-surface-variant',
    bgToken: '--color-dark-surface-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Primary brand link/text on Dark Surface',
    fgToken: '--color-dark-primary',
    bgToken: '--color-dark-surface',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Primary brand link/text on Dark Card',
    fgToken: '--color-dark-primary',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Button on-primary on Dark Primary',
    fgToken: '--color-dark-on-primary',
    bgToken: '--color-dark-primary',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Badge on-secondary-container Dark',
    fgToken: '--color-dark-on-secondary-container',
    bgToken: '--color-dark-secondary-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Good badge on-good-container Dark',
    fgToken: '--color-dark-on-good-container',
    bgToken: '--color-dark-good-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Good status text on Dark Card',
    fgToken: '--color-dark-good',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Caution badge on-caution-container Dark',
    fgToken: '--color-dark-on-caution-container',
    bgToken: '--color-dark-caution-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Caution text on Dark Card',
    fgToken: '--color-dark-caution',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Error badge on-error-container Dark',
    fgToken: '--color-dark-on-error-container',
    bgToken: '--color-dark-error-container',
    kind: 'text',
    minRatio: 4.5,
  },
  {
    mode: 'dark',
    label: 'Error text on Dark Card',
    fgToken: '--color-dark-error',
    bgToken: '--color-dark-surface-container-low',
    kind: 'text',
    minRatio: 4.5,
  },
  // Dark mode UI / gauge non-text graphical contrast (>= 3.0)
  {
    mode: 'dark',
    label: 'Input border outline on Dark Card',
    fgToken: '--color-dark-outline',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Good arc on Dark Card',
    fgToken: '--gauge-good',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Moderate arc on Dark Card',
    fgToken: '--gauge-moderate',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Sensitive arc on Dark Card',
    fgToken: '--gauge-sensitive',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Unhealthy arc on Dark Card',
    fgToken: '--gauge-unhealthy',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Very Unhealthy arc on Dark Card',
    fgToken: '--gauge-very-unhealthy',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
  {
    mode: 'dark',
    label: 'Gauge Severe arc on Dark Card',
    fgToken: '--gauge-severe',
    bgToken: '--color-dark-surface-container-low',
    kind: 'ui',
    minRatio: 3.0,
  },
];

const cssPath = path.resolve(import.meta.dirname, '..', 'src', 'index.css');
const css = fs.readFileSync(cssPath, 'utf8');
const { theme, lightVars, darkVars } = parseHexTokens(css);

let failures = 0;
console.log('| Mode | Pair | Foreground | Background | Ratio | Threshold | Status |');
console.log('| :--- | :--- | :--- | :--- | ---: | ---: | :--- |');

for (const pair of PAIRS) {
  const palette = pair.mode === 'light' ? { ...theme, ...lightVars } : { ...theme, ...darkVars };
  const fgHex = palette[pair.fgToken];
  const bgHex = palette[pair.bgToken];

  if (!fgHex || !bgHex) {
    failures += 1;
    console.log(
      `| ${pair.mode} | ${pair.label} | ${pair.fgToken} (missing) | ${pair.bgToken} | - | ${pair.minRatio}:1 | FAIL |`,
    );
    continue;
  }

  const ratio = contrastRatio(fgHex, bgHex);
  const ok = ratio >= pair.minRatio;
  if (!ok) failures += 1;

  console.log(
    `| ${pair.mode} | ${pair.label} | \`${fgHex}\` | \`${bgHex}\` | ${ratio.toFixed(2)}:1 | >= ${pair.minRatio}:1 | ${ok ? 'PASS' : 'FAIL'} |`,
  );
}

console.log(`\nChecked ${PAIRS.length} WCAG 2.2 AA contrast pairs: ${failures} failure(s).`);
if (failures > 0) {
  process.exit(1);
}
