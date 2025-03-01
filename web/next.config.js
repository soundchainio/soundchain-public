module.exports = {
  reactStrictMode: false,
  images: {
    domains: [
      'placeimg.com',
      'cdn.fakercloud.com',
      'soundchain.mypinata.cloud',
      ...(process.env.UPLOADS_DOMAIN ? [process.env.UPLOADS_DOMAIN] :),
      'soundchain.io',
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true, // 301 redirect (permanent)
      },
    ];
  },
};
