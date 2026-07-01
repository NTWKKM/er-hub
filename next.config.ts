import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/er-hub',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;