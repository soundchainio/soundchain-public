module.exports = {
  reactStrictMode: false,
  images: {
    domains: [
      'placeimg.com',
      'cdn.fakercloud.com',
      'soundchain.mypinata.cloud',
      'soundchain-api-production-uploads.s3.us-east-1.amazonaws.com',
      'soundchain-api-develop-uploads.s3.us-east-1.amazonaws.com',
      process.env.UPLOADS_DOMAIN || '',
    ].filter(Boolean),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Bypass TypeScript errors
  },
  // Fix @web3modal/ethers5 module resolution - it looks for 'ethers5' instead of 'ethers'
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'ethers5': 'ethers',
    };
    return config;
  },
  // Fix Google OAuth Permissions-Policy error
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'publickey-credentials-get=*, publickey-credentials-create=*, identity-credentials-get=*',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
};
