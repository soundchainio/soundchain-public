// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require('next-pwa')

module.exports = withPWA({
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  mode: {
    styledComponents: true,
  },
  pwa: {
    dest: 'public',
    disable: true,
  },
  reactStrictMode: true,
  images: {
    domains: ['placeimg.com', 'cdn.fakercloud.com', 'soundchain.mypinata.cloud', process.env.UPLOADS_DOMAIN],
  },
})
