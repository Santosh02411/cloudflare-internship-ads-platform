module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  },
  experimental: {
    esmExternals: true,
  },
};
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Add this line
  // ... your other config
};
module.exports = nextConfig;