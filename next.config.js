/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable Fast Refresh for all pages including API routes
  experimental: {
    // This enables Fast Refresh for API routes
    serverExternalPackages: [],
  },
  // Ensure we don't ignore watch events
  webpack: (config, { isServer }) => {
    // Optimize for development experience
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

module.exports = nextConfig; 