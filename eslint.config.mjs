/* eslint-disable */

import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/.eslintrc.js'],
  },
  ...compat.extends('plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'),
  {
    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // === TypeScript ===
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-empty-interface': [
        'error',
        {
          allowSingleExtends: true,
        },
      ],

      // === NestJS ===
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for NestJS

      // === Decorator ===
      '@typescript-eslint/no-unsafe-declaration-merging': 'warn',
      '@typescript-eslint/parameter-properties': [
        'error',
        {
          allow: ['readonly', 'private readonly', 'protected readonly', 'public readonly'],
        },
      ],

      // === Class ===
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/consistent-generic-constructors': ['error', 'constructor'],

      // === Errors handling ===
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // === Performance ===
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksConditionals: true,
          checksVoidReturn: false, // Allow promises in event handlers
        },
      ],

      // === Code quality ===
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // === Import/Export ===
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],

      // === JavaScript ===
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-lonely-if': 'error',
      'prefer-object-spread': 'error',
      'no-useless-concat': 'error',
      'no-template-curly-in-string': 'error',
      'no-return-await': 'error',
      'no-promise-executor-return': 'error',

      // === Naming convention ===
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase', 'snake_case'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'method',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'property',
          format: ['camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE'],
          filter: {
            regex: '^(Authorization|Content-Type|X-.*|Accept)$',
            match: false,
          },
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // === Security ===
      '@typescript-eslint/no-implied-eval': 'error',
    },
  },
];
