/** @type {import('lint-staged').Config} */
export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
};
