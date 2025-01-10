const webpack = require('webpack');

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
    
    // Handle Node.js built-in modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        assert: require.resolve('assert/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        url: require.resolve('url/'),
        net: false,
        tls: false,
        fs: false,
        path: false,
        zlib: require.resolve('browserify-zlib'),
        querystring: require.resolve('querystring-es3'),
      };

      // Add buffer to externals
      config.externals = [...(config.externals || []), { "bufferutil": "bufferutil", "utf-8-validate": "utf-8-validate" }];

      // Add fallback for process
      config.resolve.alias = {
        ...config.resolve.alias,
        process: "process/browser"
      };

      // Add polyfill plugins
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    
    // Suppress any remaining warnings
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch\/lib\/index\.js/ },
      { module: /node_modules\/firebase\/.*/ },
      { module: /node_modules\/@firebase\/.*/ },
      { module: /node_modules\/jsonwebtoken\/.*/ },
      { module: /node_modules\/jwt-decode\/.*/ },
      { module: /node_modules\/jws\/.*/ }
    ];
    
    return config;
  }
};

module.exports = nextConfig;
