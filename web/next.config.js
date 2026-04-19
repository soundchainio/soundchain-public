const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Custom service worker for push notification handling
  sw: 'sw.js',
  // Custom worker directory for push notification handlers
  customWorkerDir: 'worker',
  // Exclude some precaching for faster SW updates
  buildExcludes: [/chunks\/.*$/, /middleware-manifest\.json$/],
  // Use NetworkFirst for page navigations so stale SW cache never blocks pages
  // Pulse uses NetworkOnly to prevent #310 crashes from stale cached JS
  runtimeCaching: [
    {
      urlPattern: /\/(dex\/)?pulse/,
      handler: 'NetworkOnly',
    },
    {
      // Login: NEVER cache. SW was breaking login when Lambda 504'd.
      urlPattern: /\/login/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/.*\/(radio|dex|backend|get-verified).*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: false,
  // Rewrites: top-level URLs silently serve content from /dex/ mega-router
  // User sees /users/handle but Next.js renders /dex/users/handle internally
  async rewrites() {
    return [
      // Profile pages
      { source: '/users/:handle', destination: '/dex/users/:handle' },
      { source: '/artist/:handle', destination: '/dex/users/:handle' },
      // Track detail
      { source: '/track/:id', destination: '/dex/track/:id' },
      // Settings
      { source: '/settings', destination: '/dex/settings' },
      { source: '/settings/:path*', destination: '/dex/settings/:path*' },
      // Wallet
      { source: '/wallet', destination: '/dex/wallet' },
      { source: '/wallet/:path*', destination: '/dex/wallet/:path*' },
      // Playlist
      { source: '/playlist/:id', destination: '/dex/playlist/:id' },
      // Post detail
      { source: '/post/:id', destination: '/dex/post/:id' },
      // Messages
      { source: '/messages', destination: '/dex/messages' },
      { source: '/messages/:id', destination: '/dex/messages/:id' },
      // Explore / Library / Marketplace (rendered by mega-router)
      { source: '/explore', destination: '/dex/explore' },
      { source: '/library', destination: '/dex/library' },
      // marketplace ghosted — shop lives on user profiles now
      // Notifications
      { source: '/notifications', destination: '/dex/notifications' },
      // Staking
      { source: '/staking', destination: '/dex/staking' },
      // Stories
      { source: '/story/:path*', destination: '/dex/story/:path*' },
      // Announcements
      { source: '/announcements', destination: '/dex/announcements' },
      // Feedback
      { source: '/feedback', destination: '/dex/feedback' },
    ]
  },
  // Redirects: old /dex/ URLs → clean top-level URLs
  async redirects() {
    return [
      // Old /dex/ paths → new top-level (301 permanent)
      { source: '/dex/users/:handle', destination: '/users/:handle', permanent: true },
      { source: '/dex/track/:id', destination: '/track/:id', permanent: true },
      { source: '/dex/settings', destination: '/settings', permanent: true },
      { source: '/dex/settings/:path*', destination: '/settings/:path*', permanent: true },
      { source: '/dex/wallet', destination: '/wallet', permanent: true },
      { source: '/dex/wallet/:path*', destination: '/wallet/:path*', permanent: true },
      { source: '/dex/playlist/:id', destination: '/playlist/:id', permanent: true },
      { source: '/dex/post/:id', destination: '/post/:id', permanent: true },
      { source: '/dex/messages', destination: '/messages', permanent: true },
      { source: '/dex/messages/:id', destination: '/messages/:id', permanent: true },
      { source: '/dex/explore', destination: '/explore', permanent: true },
      { source: '/dex/library', destination: '/library', permanent: true },
      { source: '/dex/marketplace', destination: '/marketplace', permanent: true },
      { source: '/dex/notifications', destination: '/notifications', permanent: true },
      { source: '/dex/staking', destination: '/staking', permanent: true },
      { source: '/dex/story/:path*', destination: '/story/:path*', permanent: true },
      { source: '/dex/announcements', destination: '/announcements', permanent: true },
      { source: '/dex/feedback', destination: '/feedback', permanent: true },
      // Legacy aliases
      { source: '/tracks/:id', destination: '/track/:id', permanent: true },
      { source: '/claim-badge-profile', destination: '/nodes', permanent: false },
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
          // NOTE: Removed Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy
          // These headers block Magic SDK OAuth popups on desktop browsers (Bug #15)
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          // CSP moved to vercel.json for proper Vercel header handling
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
});
