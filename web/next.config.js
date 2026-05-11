const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Custom service worker for push notification handling
  sw: 'sw.js',
  // Custom worker directory for push notification handlers
  customWorkerDir: 'worker',
  // Exclude ALL chunks from precaching — forces fresh fetch on every deploy
  buildExcludes: [/chunks\/.*$/, /middleware-manifest\.json$/, /\.map$/],
  // ZERO stale cache for pages — users ALWAYS get fresh content after deploy.
  // Only static assets (images, fonts) get cached. No more "clear cache" needed.
  runtimeCaching: [
    {
      // Page navigations — NetworkFirst with 5s timeout + short cache fallback.
      // Was 'NetworkOnly' which returned no fallback when network blipped (e.g. post-Mac-wake DNS hiccup),
      // producing a chrome-error://chromewebdata/ page that killed Google OAuth popups.
      // NetworkFirst still serves fresh content when network is healthy; falls back to last
      // successful cache only when the network actually fails. Cache TTL kept tight (1 hr) so
      // post-deploy freshness is still nearly immediate.
      urlPattern: /^https:\/\/soundchain\.(io|fm)\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'page-navigations',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      // Next.js data fetches — NetworkFirst with same fallback behavior
      urlPattern: /\/_next\/data\/.+\/.+\.json$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      // Static assets (JS/CSS bundles) — cache with revalidation
      // These have content-hashed filenames so new deploys = new URLs automatically
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // Images — cache for performance
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: false,
  // Phase 1 shared packages — transpile from ../packages/* source at build time.
  // Lets web/ import @soundchain/types + @soundchain/scid without a build step.
  // Future mint app will consume the same packages identically.
  transpilePackages: ['@soundchain/types', '@soundchain/scid'],
  // Rewrites: top-level URLs silently serve content from /dex/ mega-router
  // User sees /users/handle but Next.js renders /dex/users/handle internally
  async rewrites() {
    return [
      // Profile pages + users list
      { source: '/users', destination: '/dex/users' },
      { source: '/users/:handle', destination: '/dex/users/:handle' },
      { source: '/artist/:handle', destination: '/dex/users/:handle' },
      // Track detail
      { source: '/track/:id', destination: '/dex/track/:id' },
      // Settings
      { source: '/settings', destination: '/dex/settings' },
      { source: '/settings/:path*', destination: '/dex/settings/:path*' },
      // Wallet — rewrite to mega-router (has full NFT collection, staking, sweep, transfers)
      { source: '/wallet', destination: '/dex/wallet' },
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
  // Redirects: legacy aliases only (NO /dex/ → top-level here — rewrites handle that)
  // The /pages/dex/*.tsx redirect stubs handle old /dex/ bookmarks.
  // DO NOT add /dex/users → /users redirects — they loop with the rewrites above.
  async redirects() {
    return [
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
