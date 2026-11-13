import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Instants are stored as UTC and must be rendered in the user's own IANA zone.
      // Any formatter that doesn't take an explicit `timeZone` silently inherits the
      // running process's zone — right on the machine of a developer who happens to
      // live in the user's zone, wrong everywhere else, and invisible either way.
      // src/lib/datetime.ts is the one place allowed to reach for these directly.
      // (ADR 019)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^toLocale(Date|Time)?String$/]',
          message:
            'format dates only in src/lib/datetime.ts, the one place a date is turned into text. For numbers, use Intl.NumberFormat.',
        },
        {
          selector:
            ":matches(NewExpression, CallExpression)[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message:
            'construct Intl.DateTimeFormat only in src/lib/datetime.ts, the one place a date is turned into text.',
        },
      ],
      // Holds every write to a page's own URL to the one hook, so that no write can forget
      // to keep the page's scroll.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router-dom',
              importNames: ['useSearchParams'],
              message:
                "read and write a page's search params through useViewParams in src/lib/viewParams.ts, whose writes never reset scroll (ADR 097)",
            },
          ],
        },
      ],
    },
  },
  {
    // The sanctioned exception — the one module that turns a date into text and reads the
    // browser's zone.
    files: ['src/lib/datetime.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // The sanctioned exception — this module exists to make every write keep the scroll.
    files: ['src/lib/viewParams.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
