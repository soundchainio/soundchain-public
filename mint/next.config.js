/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Shared monorepo packages — compiled from TS source at build time
  // @soundchain/* packages inlined locally for now (Vercel monorepo
  // workspace not configured at Root Directory = mint/). When yarn
  // workspaces lands, restore: ['@soundchain/types', '@soundchain/scid', '@soundchain/contracts']
  // Capacitor-friendly: keep server-rendered shape simple, no edge runtime quirks
  experimental: {
    // Reserved for future tweaks; intentionally empty so we don't carry over web/ debt
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.mypinata.cloud' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: '**.soundchain.io' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
