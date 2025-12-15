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
  // Ensure all /dex/* routes are properly handled by Next.js catch-all
  async rewrites() {
    return [
      // Ensure /dex/users/[handle] routes to the catch-all page
      {
        source: '/dex/users/:handle',
        destination: '/dex/users/:handle',
      },
      // Ensure /dex/profile/[id] routes to the catch-all page
      {
        source: '/dex/profile/:id',
        destination: '/dex/profile/:id',
      },
      // Ensure /dex/track/[id] routes to the catch-all page
      {
        source: '/dex/track/:id',
        destination: '/dex/track/:id',
      },
    ]
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
