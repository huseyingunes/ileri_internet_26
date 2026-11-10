import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '.veri/', 'drizzle/', '1_api_rest/', '2_authentication/', '2_sinav/', '3_sinav/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.js'],
    languageOptions: { globals: globals.node, ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: globals.browser, ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
