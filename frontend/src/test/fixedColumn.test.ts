/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

// Each of these places a fixed element: across the window, or on the column every page sits in.
const PLACEMENTS = ['inset-0', 'inset-x-column', 'left-column'];

// Every source file under src/, leaving out the tests, since a test may hold the offence on purpose.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

/** Every string or template literal in a source file whose words, split at white space, hold
 * `fixed` and none of the placements, as `<where>:<line>`. Comments are never read. */
export function fixedOutsideColumn(where: string, text: string): string[] {
  const source = ts.createSourceFile(where, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    let literal: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) literal = node.text;
    // A template's own text, its substitutions apart, is read as one class list.
    if (ts.isTemplateExpression(node)) {
      literal = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
    }
    if (literal !== null) {
      const words = literal.split(/\s+/);
      if (words.includes('fixed') && !PLACEMENTS.some((placement) => words.includes(placement))) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        found.push(`${where}:${line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('fixed elements', () => {
  it('reports fixed beside no column utility and passes each of the three', () => {
    expect(fixedOutsideColumn('a.tsx', '<div className="fixed inset-x-0 bottom-0" />')).toEqual([
      'a.tsx:1',
    ]);
    expect(fixedOutsideColumn('a.ts', "const c = 'z-10 fixed left-0';")).toEqual(['a.ts:1']);
    expect(
      fixedOutsideColumn('a.tsx', 'const x = 1;\n<div className={`fixed ${open ? "a" : "b"}`} />'),
    ).toEqual(['a.tsx:2']);
    for (const placement of PLACEMENTS) {
      expect(fixedOutsideColumn('a.tsx', `<div className="fixed ${placement} z-10" />`)).toEqual(
        [],
      );
    }
    expect(
      fixedOutsideColumn('a.tsx', '// a fixed inset-x-0 bar\n/* fixed left-0 */\nconst a = 1;'),
    ).toEqual([]);
    expect(fixedOutsideColumn('a.ts', "const c = 'prefixed fixed-width';")).toEqual([]);
  });

  it('finds no fixed element outside the column in any source file', () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(40);
    const found = files.flatMap((file) =>
      fixedOutsideColumn(relative(SRC, file), readFileSync(file, 'utf8')),
    );
    expect(found).toEqual([]);
  });
});
