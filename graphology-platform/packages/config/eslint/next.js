import nextPlugin from '@next/eslint-plugin-next';
import reactConfig from './react-library.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...reactConfig,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
