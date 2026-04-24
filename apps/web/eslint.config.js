// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import checkFile from 'eslint-plugin-check-file';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ---------------------------------------------------------------------------
// Architectural boundary definitions
//
// Layer hierarchy — each layer may only import from layers listed below it:
//
//   app, pages         ← route-level composition; orchestrate features
//     features         ← isolated vertical slices (cross-feature: blocked)
//       components     ← shared presentational components
//         hooks        ← shared custom hooks
//           lib        ← third-party library wrappers
//           utils      ← pure utility functions
//           config     ← environment / app configuration
//           types      ← shared TypeScript types (no internal imports)
//           assets     ← static files (no internal imports)
//
//   testing            ← test utilities; unrestricted (never imported by app)
// ---------------------------------------------------------------------------
const BOUNDARY_ELEMENTS = [
  { type: 'app', pattern: 'src/app/**' },
  { type: 'pages', pattern: 'src/pages/**' },
  // capture: ['featureName'] lets the cross-feature rule reference {{from.captured.featureName}}
  { type: 'features', pattern: 'src/features/*/**', capture: ['featureName'] },
  { type: 'components', pattern: 'src/components/**' },
  { type: 'hooks', pattern: 'src/hooks/**' },
  { type: 'lib', pattern: 'src/lib/**' },
  { type: 'utils', pattern: 'src/utils/**' },
  { type: 'config', pattern: 'src/config/**' },
  { type: 'types', pattern: 'src/types/**' },
  { type: 'assets', pattern: 'src/assets/**' },
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
];

export default tseslint.config(
  // IGNORED PATHS
  { ignores: ['dist/**', 'coverage/**'] },

  // TYPESCRIPT
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
      // align with verbatimModuleSyntax — always use "import type" for type-only imports
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
  },

  // REACT
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.strict,
    ],
    plugins: { 'react-compiler': reactCompiler },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },

  // IMPORT SORTING
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
  },

  // CODE STYLE
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Program > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"]',
          message:
            'Prefer a function declaration at the module level. Use `function foo() {}` instead of `const foo = () => {}`.',
        },
      ],
    },
  },

  // ARCHITECTURAL BOUNDARIES
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': BOUNDARY_ELEMENTS,
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
            // Cross-feature imports are blocked — lift shared code to components/hooks/lib
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
              allow: ['hooks', 'lib', 'utils', 'config', 'types', 'assets'].map(
                (type) => ({ to: { type } }),
              ),
            },
            // hooks: lib and below
            {
              from: { type: 'hooks' },
              allow: ['lib', 'utils', 'config', 'types'].map((type) => ({
                to: { type },
              })),
            },
            // lib + utils: config and types
            {
              from: [{ type: 'lib' }, { type: 'utils' }],
              allow: ['config', 'types'].map((type) => ({ to: { type } })),
            },
            // config: types only
            {
              from: { type: 'config' },
              allow: [{ to: { type: 'types' } }],
            },
            // testing: unrestricted access (test utilities; never imported by app code)
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
  // test files are co-located with source — exempt them from boundary enforcement.
  // they are never imported by app code so they can't create real coupling.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'boundaries/no-unknown': 'off',
      'boundaries/dependencies': 'off',
    },
  },

  // FILE NAMING
  {
    plugins: { 'check-file': checkFile },
    rules: {
      // All ts files must be kebab-case: app.tsx, use-auth.ts, user-card.tsx
      // ignoreMiddleExtensions handles .test.tsx, .stories.tsx, etc. — only the
      // base name (before the first dot) is checked
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      // All directories under src/ must also be kebab-case
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': 'KEBAB_CASE' },
      ],
    },
  },

  // PRETTIER
  // prettier must be last
  prettier,
);
