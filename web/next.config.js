// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require('next-pwa');

module.exports = withPWA({
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  },
  reactStrictMode: true,
  images: {
    domains: ['placeimg.com', 'cdn.fakercloud.com', 'soundchain.mypinata.cloud', process.env.UPLOADS_DOMAIN],
  },
});
