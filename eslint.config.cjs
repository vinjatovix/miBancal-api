const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const importX = require('eslint-plugin-import-x');
const sonarjs = require('eslint-plugin-sonarjs');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  sonarjs.configs.recommended,

  {
    linterOptions: {
      reportUnusedDisableDirectives: false
    },

    languageOptions: {
      globals: {
        ...globals.node
      },
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },

    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import-x': importX
    },

    extends: compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'prettier'
    ),

    rules: {
      complexity: ['error', 10],
      'sonarjs/cognitive-complexity': ['error', 15],
      // @typescript-eslint/no-unused-vars already governs dead bindings and
      // honours the `^_` intentional-discard convention (destructuring omit);
      // SonarJS's duplicate flags those deliberate `_`-prefixed discards.
      'sonarjs/no-unused-vars': 'off',
      // Not in sonarjs/recommended by default; enabled here so the local pass
      // catches collapsible `if` smells before they reach SonarCloud.
      'sonarjs/no-collapsible-if': 'error',
      // Code over comments: no Arrange/Act/Assert markers in tests.
      'no-warning-comments': [
        'error',
        { terms: ['arrange', 'act', 'assert'], location: 'start' }
      ],
      // AGENTS.md import order: Node built-ins, npm packages, then parent
      // (distant first), then siblings; alphabetical within each group.
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'parent', ['sibling', 'index']],
          'newlines-between': 'ignore',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false
          }
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },

  {
    // Step definitions keep per-scenario state on the World and per-run
    // resources in suite(); module-level reassignable state leaks between
    // scenarios.
    files: ['tests/apps/agroApi/features/step_definitions/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > VariableDeclaration[kind=/^(let|var)$/]',
          message:
            'No module-level let/var in step definitions: use the World (per scenario) or suite() (per run).'
        },
        {
          selector:
            'Program > ExportNamedDeclaration > VariableDeclaration[kind=/^(let|var)$/]',
          message:
            'No module-level let/var in step definitions: use the World (per scenario) or suite() (per run).'
        }
      ]
    }
  },

  {
    // Test assertions compare exact, deterministic round-trip values
    // (persisted/mapped coordinates and dimensions) with no floating-point
    // arithmetic, so there is no drift for `no-floating-point-equality` to
    // guard against; the rule targets arithmetic comparisons, not these.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'sonarjs/no-floating-point-equality': 'off'
    }
  },

  {
    // Component-scanner fixtures are empty shells on purpose: they exercise
    // file discovery, not behaviour. Local counterpart to the fixture
    // scaffolding exemption in sonar-project.properties (there scoped to
    // `typescript:S1186` empty-function; here `no-empty-collection`).
    files: ['tests/apps/agroApi/wiring/fixtures/**/*.{ts,tsx}'],
    rules: {
      'sonarjs/no-empty-collection': 'off'
    }
  },

  globalIgnores([
    '**/dist/',
    '**/node_modules/',
    '**/coverage/',
    '**/docker/',
    'eslint.config.cjs',
    'commitlint.config.cjs',
    'cucumber.mjs'
  ])
]);
