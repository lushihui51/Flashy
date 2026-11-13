/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

// Each holds a name to one line, breaks it inside a word, or scrolls its row sideways. A letter,
// a digit or a hyphen on either side makes a different class, so a variant's colon and an
// important's "!" still count.
const HELD_CLASS =
  /(?<![A-Za-z0-9-])(?:truncate|text-ellipsis|line-clamp-1|break-all|overflow-x-auto)(?![A-Za-z0-9-])/g;

// Every component and page, leaving out the tests, since a test may hold the offence on purpose.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.tsx') && !/\.test\./.test(name) ? [path] : [];
  });
}

/** Every class that holds a name to one line, breaks inside a word or scrolls sideways, found in
 * a string or template literal of `text`, as `<where>: <class>`. A comment is never read. */
export function heldClasses(where: string, text: string): string[] {
  const source = ts.createSourceFile(where, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    // A template's text arrives in pieces, one on each side of every `${}`.
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
      for (const match of node.text.matchAll(HELD_CLASS)) found.push(`${where}: ${match[0]}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('names held to one line', () => {
  it('reports each class in a string or a template, variants included', () => {
    expect(heldClasses('a.tsx', 'const c = "block truncate";')).toEqual(['a.tsx: truncate']);
    expect(heldClasses('a.tsx', 'const c = <i className="sm:truncate !truncate" />;')).toEqual([
      'a.tsx: truncate',
      'a.tsx: truncate',
    ]);
    expect(
      heldClasses('a.tsx', 'const c = `text-ellipsis ${x ? "break-all" : ""} overflow-x-auto`;'),
    ).toEqual(['a.tsx: text-ellipsis', 'a.tsx: break-all', 'a.tsx: overflow-x-auto']);
    expect(heldClasses('a.tsx', "const c = 'line-clamp-1';")).toEqual(['a.tsx: line-clamp-1']);
  });

  it('passes another class, a comment and code', () => {
    expect(
      heldClasses('a.tsx', 'const c = "truncate-x line-clamp-2 line-clamp-10 break-words";'),
    ).toEqual([]);
    expect(
      heldClasses('a.tsx', '// truncate\n/* break-all */\nconst c = <i>{/* truncate */}</i>;'),
    ).toEqual([]);
    expect(heldClasses('a.tsx', 'const truncate = 1; const c = <p>truncate</p>;')).toEqual([]);
  });

  it('finds none in any component or page', () => {
    const files = [...sourceFiles(join(SRC, 'components')), ...sourceFiles(join(SRC, 'pages'))];
    expect(files.length).toBeGreaterThan(40);
    const found = files.flatMap((file) =>
      heldClasses(relative(SRC, file), readFileSync(file, 'utf8')),
    );
    expect(found).toEqual([]);
  });
});
