/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

// Every source file under src/, leaving out index.css, whose utilities hold the hairlines and the
// press, and the tests, since a test may hold the offence on purpose.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    const rel = relative(SRC, path);
    if (statSync(path).isDirectory()) return rel === 'test' ? [] : sourceFiles(path);
    if (!/\.(ts|tsx|css)$/.test(name) || /\.test\./.test(name) || rel === 'index.css') return [];
    return [path];
  });
}

/** Every `<number>px` in a source line under src/, index.css and the tests excepted. */
export function pxLiterals(where: string, text: string): string[] {
  return text
    .split('\n')
    .flatMap((line, i) => (/\d(?:\.\d+)?px\b/.test(line) ? [`${where}:${i + 1}`] : []));
}

describe('px literals', () => {
  it('reports a px length and passes a measured value and the px suffix', () => {
    expect(pxLiterals('a.tsx', 'h-[46px]')).toEqual(['a.tsx:1']);
    expect(pxLiterals('a.tsx', 'gap-px')).toEqual([]);
    expect(pxLiterals('a.tsx', '`${height}px`')).toEqual([]);
    expect(pxLiterals('a.tsx', 'h-11.5')).toEqual([]);
  });

  it('finds no px literal in any source file', () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(40);
    const found = files.flatMap((file) =>
      pxLiterals(relative(SRC, file), readFileSync(file, 'utf8')),
    );
    expect(found).toEqual([]);
  });
});
