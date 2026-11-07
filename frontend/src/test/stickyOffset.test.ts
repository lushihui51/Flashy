/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

// Every source file under src/, leaving out the tests, since a test may hold the offence on purpose.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

function hardCodedStickyOffsets(where: string, text: string): string[] {
  return text.split('\n').flatMap((line, i) =>
    /\bsticky\b/.test(line) && line.includes('top-[') ? [`${where}:${i + 1}`] : [],
  );
}

describe('sticky offsets', () => {
  it('reports a hard-coded top beside sticky and passes a measured one', () => {
    expect(hardCodedStickyOffsets('a.tsx', '<div className="sticky top-[114px]" />')).toEqual([
      'a.tsx:1',
    ]);
    expect(
      hardCodedStickyOffsets('a.tsx', '<div className="sticky top-(--app-header-height)" />'),
    ).toEqual([]);
  });

  it('finds no hard-coded top beside sticky in any source file', () => {
    const found = sourceFiles(SRC).flatMap((file) =>
      hardCodedStickyOffsets(relative(SRC, file), readFileSync(file, 'utf8')),
    );
    expect(found).toEqual([]);
  });
});
