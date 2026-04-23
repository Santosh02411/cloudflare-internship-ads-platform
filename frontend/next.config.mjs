/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  eslint: {
    // This allows the build to continue even if there are linting errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This allows the build to continue even if there are type errors
    ignoreBuildErrors: true,
  },
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;