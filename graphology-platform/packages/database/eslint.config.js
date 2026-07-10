import baseConfig from '@graphology/config/eslint/base';

export default [
  {
    ignores: ['prisma/**', 'dist/**', 'src/**/*.js', 'src/**/*.d.ts'],
  },
  ...baseConfig,
];
