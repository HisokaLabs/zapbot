import js from '@eslint/js';
import { flatConfigs as importXFlatConfigs } from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
   {
      ignores: ['node_modules/**', '.auth/**', 'sessions/**', 'temp/**', 'coverage/**'],
   },

   js.configs.recommended,
   importXFlatConfigs.recommended,

   {
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: {
            ...globals.node,
         },
      },

      settings: {
         'import-x/resolver': {
            node: {
               extensions: ['.js'],
            },
         },
      },

      rules: {
         // Package.json subpath imports (#core/*.js, #types, ...) are valid Node
         // resolution that the node resolver above can't see - don't flag them.
         'import-x/no-unresolved': ['error', { ignore: ['^#'] }],
         'import-x/named': 'off',

         'import-x/order': [
            'error',
            {
               groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
               pathGroups: [
                  {
                     pattern: '#*/**',
                     group: 'internal',
                     position: 'before',
                  },
                  {
                     pattern: '#*',
                     group: 'internal',
                     position: 'before',
                  },
               ],
               pathGroupsExcludedImportTypes: ['builtin'],
               'newlines-between': 'always',
               alphabetize: {
                  order: 'asc',
                  caseInsensitive: true,
               },
            },
         ],
         'import-x/no-duplicates': 'error',
         'import-x/no-self-import': 'error',
         'import-x/no-cycle': 'off',
         'import-x/newline-after-import': 'error',

         'no-unused-vars': ['warn', { argsIgnorePattern: '^_', args: 'after-used' }],
         'no-console': 'off',
      },
   },

   // Prettier must be last: disables stylistic ESLint rules that would
   // conflict with it, then reports formatting issues as lint errors.
   prettierPlugin,
];
