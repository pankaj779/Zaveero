import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output is for Linux/Docker images. On Windows, Next's symlink
  // tracing often fails without Developer Mode (EPERM), so keep it opt-in.
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' as const } : {}),
  transpilePackages: ['@graphology/ui', '@graphology/types', '@graphology/utils'],
};

export default nextConfig;
