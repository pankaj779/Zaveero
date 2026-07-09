#!/usr/bin/env node

/**
 * Development environment setup helper.
 * Validates that required tooling is available.
 */

const requiredNodeMajor = 20;
const nodeVersion = process.versions.node;
const major = Number(nodeVersion.split('.')[0]);

if (major < requiredNodeMajor) {
  console.error(
    `Node.js ${requiredNodeMajor}+ is required. Current version: ${nodeVersion}`,
  );
  process.exit(1);
}

console.log('Development environment prerequisites satisfied.');
console.log(`Node.js: ${nodeVersion}`);
