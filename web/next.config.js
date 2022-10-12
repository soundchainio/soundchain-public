// eslint-disable-next-line @typescript-eslint/no-var-requires
// const withPWA = require('next-pwa')

// module.exports = withPWA({
//   pwa: {
//     dest: 'public',
//     disable: true,
//   },
//   reactStrictMode: true,
//   images: {
//     domains: ['placeimg.com', 'cdn.fakercloud.com', 'soundchain.mypinata.cloud', process.env.UPLOADS_DOMAIN],
//   },
// })

module.exports = {
  reactStrictMode: false,
  images: {
    domains: ['placeimg.com', 'cdn.fakercloud.com', 'soundchain.mypinata.cloud', process.env.UPLOADS_DOMAIN],
  },
}
