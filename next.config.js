/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Replace punycode with tr46
    config.resolve.alias = {
      ...config.resolve.alias,
      'punycode': 'tr46'
    };
    
    // Suppress any remaining warnings
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch\/lib\/index\.js/ }
    ];
    
    return config;
  }
};

module.exports = nextConfig;
