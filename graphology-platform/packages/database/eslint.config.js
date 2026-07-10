import baseConfig from '@graphology/config/eslint/base';

export default [
  {
    ignores: ['prisma/**'],
  },
  ...baseConfig,
];
