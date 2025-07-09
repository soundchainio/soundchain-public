module.exports = {
  reactStrictMode: false,
  images: {
    domains: [
      'placeimg.com',
      'cdn.fakercloud.com',
      'soundchain.mypinata.cloud',
      process.env.UPLOADS_DOMAIN || '',
    ].filter(Boolean),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
