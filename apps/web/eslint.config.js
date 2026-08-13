// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import checkFile from 'eslint-plugin-check-file';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ---------------------------------------------------------------------------
// Architectural boundary definitions
//
// Layer hierarchy — each layer may only import from layers listed below it:
//
//   app, pages         < route-level composition; orchestrate features
//     features         < isolated vertical slices (cross-feature: blocked)
//       components     < shared presentational components
//         hooks        < shared custom hooks
//           lib        < third-party library wrappers
//           utils      < pure utility functions
//           config     < environment / app configuration
//           types      < shared TypeScript types (no internal imports)
//           assets     < static files (no internal imports)
//           styles     < CSS files (no internal imports)
//           constants  < numeric / string constants (no internal imports)
//
//   testing            < test utilities; unrestricted (never imported by app)
// ---------------------------------------------------------------------------
const BOUNDARY_ELEMENTS = [
  { type: 'app', pattern: 'src/app/**' },
  { type: 'pages', pattern: 'src/pages/**' },
  // capture: ['featureName'] lets the cross-feature rule reference
  // {{from.captured.featureName}}
  { type: 'features', pattern: 'src/features/*/**', capture: ['featureName'] },
  { type: 'components', pattern: 'src/components/**' },
  { type: 'hooks', pattern: 'src/hooks/**' },
  { type: 'lib', pattern: 'src/lib/**' },
  { type: 'utils', pattern: 'src/utils/**' },
  { type: 'config', pattern: 'src/config/**' },
  { type: 'types', pattern: 'src/types/**' },
  { type: 'assets', pattern: 'src/assets/**' },
  { type: 'styles', pattern: 'src/styles/**' },
  { type: 'constants', pattern: 'src/constants/**' },
  { type: 'testing', pattern: 'src/testing/**' },
];

const SHARED_LAYERS = [
  'components',
  'hooks',
  'lib',
  'utils',
  'config',
  'types',
  'assets',
  'styles',
  'constants',
];

// ---------------------------------------------------------------------------
// UI-primitive import guard (issue #208)
//
// Feature and route code consume Radix and sonner through re-export barrels,
// never the upstream packages directly. Enforced as a layered set of
// no-restricted-imports overrides (last-match-wins per rule id):
//
//   1. base: ban @radix-ui/* and sonner everywhere under src (tests exempt)
//   2. radix carve-out: the re-export barrels / wrappers under components/**
//      plus the app-root importers (provider + entry) may import @radix-ui/*;
//      sonner stays banned there.
//   3. sonner carve-out: the notify seam and the AppToaster that owns sonner's
//      config may import sonner; @radix-ui/* stays banned there.
//
// Radix is NOT carved out for all of app/** on purpose: route modules under
// app/routes/ have no direct Radix imports today, so keeping the carve-out to
// the two real app-root files prevents drift. styles.css is a side-effect
// import a barrel cannot replace, which is why this is a carve-out rather than
// a Theme/ThemePanel re-export.
// ---------------------------------------------------------------------------
const RADIX_IMPORT_MESSAGE =
  'Import Radix primitives from a @/components/ui/* re-export, not @radix-ui directly. Add a barrel under src/components/ui/ if one does not exist yet. See docs/architecture/web-features-layout.md.';
const SONNER_IMPORT_MESSAGE =
  'Do not import sonner directly. Use the @/lib/notifications notify seam for toasts (AppToaster owns sonner config). See docs/architecture/web-features-layout.md.';
const RADIX_RESTRICTED = {
  group: ['@radix-ui/**'],
  message: RADIX_IMPORT_MESSAGE,
};
const SONNER_RESTRICTED = { group: ['sonner'], message: SONNER_IMPORT_MESSAGE };

export default tseslint.config(
  // IGNORED PATHS
  { ignores: ['dist/**', 'coverage/**', 'storybook-static/**'] }, // TYPESCRIPT
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // align with verbatimModuleSyntax - always use "import type"
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      // allow void-returning async functions in JSX event handler attributes
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  }, // REACT
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.strict,
    ],
    plugins: { 'react-compiler': reactCompiler, react },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-compiler/react-compiler': 'error',
      // Sort JSX props alphabetically (case-sensitive, so capitalized props
      // sort first); `key` is pinned ahead of the sort.
      'react/jsx-sort-props': ['error', { reservedFirst: ['key'] }],
    },
  }, // IMPORT SORTING
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. external — side-effects, node: built-ins, npm packages
            ['^\\u0000', '^node:', '^@?\\w'],
            // 2. internal alias imports  @/…
            ['^@/'],
            // 3. parent-relative imports  ../…
            ['^\\.\\./'],
            // 4. sibling-relative imports  ./…
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  }, // CODE STYLE
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { unicorn },
    rules: {
      // cyclomatic cap; bump if a legitimately branchy function outgrows it.
      complexity: ['error', 15],
      'unicorn/numeric-separators-style': [
        'error',
        { number: { minimumDigits: 4 } },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Program > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"]',
          message:
            'Prefer a function declaration at the module level. Use `function foo() {}` instead of `const foo = () => {}`.',
        },
        {
          selector: 'TSEnumDeclaration',
          message:
            'Avoid `enum`; use an `as const` object or string-literal union instead (no runtime emit, real literal types).',
        },
      ],
    },
  }, // ARCHITECTURAL BOUNDARIES
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
      // only classify files under src/** - anything else (workspace packages
      // in packages/**, node_modules) is treated as external and exempt.
      'boundaries/include': ['src/**'],
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'boundaries/no-unknown': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app + pages: may import from any layer (they orchestrate)
            {
              from: [{ type: 'app' }, { type: 'pages' }],
              allow: ['features', ...SHARED_LAYERS].map((type) => ({
                to: { type },
              })),
            },
            // features: shared layers + same-feature files only
            {
              from: { type: 'features' },
              allow: [
                ...SHARED_LAYERS.map((type) => ({ to: { type } })),
                {
                  to: {
                    type: 'features',
                    captured: { featureName: '{{from.captured.featureName}}' },
                  },
                },
              ],
            },
            // components: hooks and below
            {
              from: { type: 'components' },
              allow: [
                'hooks',
                'lib',
                'utils',
                'config',
                'types',
                'assets',
                'constants',
              ].map((type) => ({ to: { type } })),
            },
            // hooks: lib and below
            {
              from: { type: 'hooks' },
              allow: ['lib', 'utils', 'config', 'types', 'constants'].map(
                (type) => ({ to: { type } }),
              ),
            },
            // lib + utils: config, types, constants
            {
              from: [{ type: 'lib' }, { type: 'utils' }],
              allow: ['config', 'types', 'constants'].map((type) => ({
                to: { type },
              })),
            },
            // config: types only
            {
              from: { type: 'config' },
              allow: [{ to: { type: 'types' } }],
            },
            // constants: types only (leaf node, no internal imports otherwise)
            {
              from: { type: 'constants' },
              allow: [{ to: { type: 'types' } }],
            },
            // testing: unrestricted access (never imported by app code)
            {
              from: { type: 'testing' },
              allow: ['app', 'pages', 'features', ...SHARED_LAYERS].map(
                (type) => ({ to: { type } }),
              ),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'boundaries/no-unknown': 'off',
      'boundaries/dependencies': 'off',
    },
  }, // UI-PRIMITIVE IMPORT GUARD (#208)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [RADIX_RESTRICTED, SONNER_RESTRICTED] },
      ],
    },
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/app/provider.tsx',
      'src/main.tsx',
    ],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [SONNER_RESTRICTED] }],
    },
  },
  {
    files: [
      'src/lib/notifications/notify.ts',
      'src/components/ui/toaster/app-toaster.tsx',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [RADIX_RESTRICTED] }],
    },
  }, // FILE NAMING
  {
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      // Folders must be kebab-case, with one exception: the `__tests__`
      // convention for colocating a directory of test files alongside its
      // siblings (e.g. button.tsx + button.module.css + __tests__/button.test.tsx).
      // The extglob unions the KEBAB_CASE pattern with the literal __tests__.
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': '@(__tests__|+([a-z0-9])*(-+([a-z0-9])))' },
      ],
    },
  }, // PRETTIER
  // prettier must be last
  prettier,
  storybook.configs['flat/recommended'],
);
