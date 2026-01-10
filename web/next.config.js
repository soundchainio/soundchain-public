module.exports = {
  reactStrictMode: false,
  // Redirect all legacy routes to DEX (modern UI)
  async redirects() {
    return [
      // Main routes → DEX feed
      { source: '/', destination: '/dex/feed', permanent: false },
      { source: '/home', destination: '/dex/feed', permanent: false },
      { source: '/posts/:id', destination: '/dex/post/:id', permanent: false },

      // Tracks → DEX track view
      { source: '/tracks/:id', destination: '/dex/track/:id', permanent: false },

      // Messages → DEX messages
      { source: '/messages', destination: '/dex/messages', permanent: false },
      { source: '/messages/:id', destination: '/dex/messages', permanent: false },

      // Notifications → DEX notifications
      { source: '/notifications', destination: '/dex/notifications', permanent: false },

      // Library → DEX library
      { source: '/library', destination: '/dex/library', permanent: false },

      // Marketplace → DEX marketplace
      { source: '/marketplace', destination: '/dex/marketplace', permanent: false },

      // Settings → DEX settings
      { source: '/settings', destination: '/dex/settings', permanent: false },
      { source: '/settings/:path*', destination: '/dex/settings', permanent: false },

      // Staking/rewards → DEX staking
      { source: '/stake', destination: '/dex/staking', permanent: false },
      { source: '/lp-stake', destination: '/dex/staking', permanent: false },
      { source: '/airdrop', destination: '/dex/staking', permanent: false },
      { source: '/ogun', destination: '/dex/staking', permanent: false },

      // Wallet → DEX wallet
      { source: '/wallet', destination: '/dex/wallet', permanent: false },
      { source: '/wallet/:path*', destination: '/dex/wallet', permanent: false },

      // Top tracks / explore → DEX explore
      { source: '/top-tracks', destination: '/dex/explore', permanent: false },

      // Roadmap → DEX announcements
      { source: '/roadmap', destination: '/dex/announcements', permanent: false },

      // User profiles → DEX profile
      { source: '/users/:handle', destination: '/dex/users/:handle', permanent: false },

      // Claim badge → DEX
      { source: '/claim-badge-profile', destination: '/dex/feed', permanent: false },
    ]
  },
  // Enable scroll position restoration on back/forward navigation
  experimental: {
    scrollRestoration: true,
  },
  images: {
    domains: [
      'placeimg.com',
      'cdn.fakercloud.com',
      'soundchain.mypinata.cloud',
      'soundchain-api-production-uploads.s3.us-east-1.amazonaws.com',
      'soundchain-api-develop-uploads.s3.us-east-1.amazonaws.com',
      'images.unsplash.com',
      'soundchain.io',
      process.env.UPLOADS_DOMAIN || '',
    ].filter(Boolean),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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
  // Fix Google OAuth Permissions-Policy error + Cache control for fresh content
  async headers() {
    return [
      {
        // HTML pages - no cache to always get fresh content
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
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        // Static assets - cache for performance
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
