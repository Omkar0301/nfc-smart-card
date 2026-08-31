import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nfc-card/shared'],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
