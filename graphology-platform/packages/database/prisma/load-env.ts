import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRootEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');

config({ path: monorepoRootEnv });
