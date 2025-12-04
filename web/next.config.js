module.exports = {
  reactStrictMode: false,
  output: 'export',
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
};
