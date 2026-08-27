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
      // ADR 019: instants are stored as UTC and must be rendered in the user's own IANA
      // zone. Any formatter that doesn't take an explicit `timeZone` silently inherits
      // the running process's zone — right on the machine of a developer who happens to
      // live in the user's zone, wrong everywhere else, and invisible either way.
      // src/lib/datetime.ts is the one place allowed to reach for these directly.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[property.name=/^toLocale(Date|Time)?String$/]',
          message:
            'ADR 019: format dates via formatDate/formatDateTime in src/lib/datetime.ts, which pins the user timezone. For numbers, use Intl.NumberFormat.',
        },
        {
          selector: ':matches(NewExpression, CallExpression)[callee.object.name=\'Intl\'][callee.property.name=\'DateTimeFormat\']',
          message:
            'ADR 019: use formatDate/formatDateTime from src/lib/datetime.ts rather than constructing Intl.DateTimeFormat, so `timeZone` is always explicit.',
        },
      ],
    },
  },
  {
    // The sanctioned exception — this module exists to apply the user's zone explicitly.
    files: ['src/lib/datetime.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
