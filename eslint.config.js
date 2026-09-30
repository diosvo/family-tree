// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Statements that read as their own paragraph and must be separated by a blank line
const PARAGRAPH = [
  'function',
  'class',
  'export',
  'multiline-block-like',
  'multiline-expression',
  'multiline-const',
  'multiline-let',
];

export default defineConfig([
  globalIgnores([
    // Generated / build output
    '**/routeTree.gen.ts',
    '.output/**',
    '.nitro/**',
    '.tanstack/**',
    '.vinxi/**',
    '.wrangler/**',
    'dist/**',
    'node_modules/**',
  ]),

  // TanStack base: typescript-eslint (type-aware), import-x, node, stylistic
  ...tanstackConfig,

  // React
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,

  {
    name: 'family-tree/rules',
    rules: {
      /* ---- Correctness ---- */
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/require-await': 'off',

      /* ---- Modern syntax ---- */
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'no-useless-rename': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

      /* ---- Blank lines between logical blocks ---- */
      '@stylistic/padding-line-between-statements': [
        'error',
        // A function / class / export / multiline block is always its own paragraph
        {
          blankLine: 'always',
          prev: '*',
          next: PARAGRAPH,
        },
        {
          blankLine: 'always',
          prev: PARAGRAPH,
          next: '*',
        },
        // Keep imports together; blank line after the import block is handled by import/newline-after-import
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'any', prev: 'export', next: 'export' },
        // Directives ("use client") stay attached
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
      ],

      /* ---- Imports ---- */
      'import/no-cycle': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-dom/**', group: 'external', position: 'before' },
            { pattern: '{@,#}/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // shadcn/ui components are vendored: keep them lint-clean but don't fight upstream style
  {
    name: 'family-tree/shadcn',
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // Route files export loaders/config, and lib context modules export Provider + hook, by design
  {
    name: 'family-tree/routes',
    files: ['src/routes/**', 'src/router.tsx', 'src/lib/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Must be last: turns off every rule that would conflict with Prettier
  prettier,
]);
