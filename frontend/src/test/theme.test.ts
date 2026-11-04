/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

/** The one colour per PDR 015 meaning; a ninth needs a product decision before it
 * enters `@theme` and this list together (ADR 090). */
const TOKENS = [
  'main-action',
  'hidden',
  'ink',
  'aside',
  'line',
  'wrong',
  'ground',
  'surface',
] as const;

const TOKEN_NAME = /--color-([a-z0-9-]+)/g;
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?)\(/g;
const PALETTE_UTILITY =
  /\b(?:bg|text|border|fill|stroke|ring|divide|outline|decoration|shadow|from|to)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black)\b/g;

// Every component source under src/, leaving out the tests, the test helpers and the
// generated API types; the theme itself is read by the first test.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    const rel = relative(SRC, path);
    if (statSync(path).isDirectory()) return rel === 'test' ? [] : sourceFiles(path);
    if (!/\.(ts|tsx|css)$/.test(name) || /\.test\./.test(name)) return [];
    if (rel === 'api/types.ts' || rel === 'api/openapi.json' || rel === 'index.css') return [];
    return [path];
  });
}

function offences(file: string, text: string): string[] {
  const found: string[] = [];
  text.split('\n').forEach((line, i) => {
    const where = `${relative(SRC, file)}:${i + 1}`;
    for (const m of line.matchAll(TOKEN_NAME)) {
      if (!(TOKENS as readonly string[]).includes(m[1] ?? '')) found.push(`${where} ${m[0]}`);
    }
    for (const re of [HEX, COLOR_FUNCTION, PALETTE_UTILITY]) {
      for (const m of line.matchAll(re)) found.push(`${where} ${m[0]}`);
    }
  });
  return found;
}

describe('theme', () => {
  it('declares exactly the eight colour tokens in @theme', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8');
    const theme = /@theme\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const declared = Array.from(
      theme.matchAll(/^\s*--color-([a-z0-9-]+)\s*:/gm),
      (m) => m[1] ?? '',
    );
    expect(declared.sort()).toEqual([...TOKENS].sort());
  });

  it('uses no colour outside the eight in any source file', () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(40);
    const found = files.flatMap((f) => offences(f, readFileSync(f, 'utf8')));
    expect(found).toEqual([]);
  });
});
