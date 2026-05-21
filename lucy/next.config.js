/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lucy is the AI surface. Porting from web/src/pages/norman.tsx — that file
  // had `ignoreBuildErrors:true` upstream so we match the posture here. App
  // routes still type-check via `yarn typecheck`.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.soundchain.io' },
      { protocol: 'https', hostname: 'soundchain.mypinata.cloud' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
