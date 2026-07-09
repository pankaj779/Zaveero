import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@graphology/ui', '@graphology/types', '@graphology/utils'],
};

export default nextConfig;
