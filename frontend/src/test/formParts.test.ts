/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

const FORMS = [
  'components/library/SubjectForm.tsx',
  'components/library/CardStandaloneForm.tsx',
  'components/library/DeckEditor.tsx',
  'components/library/DeckConfigurationEditor.tsx',
  'pages/PracticeCreatePage.tsx',
];

describe('every form draws its sentences and its Create or Save through the two components', () => {
  it.each(FORMS)('%s holds no alert or not-ready look of its own and imports SubmitButton', (path) => {
    const source = readFileSync(`${SRC}${path}`, 'utf8');

    expect(source).not.toContain('role="alert"');
    expect(source).not.toContain('aria-disabled');
    expect(source).toMatch(/import SubmitButton from /);
  });
});
