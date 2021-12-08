module.exports = {
  reactStrictMode: true,
  images: {
    domains: [
      'placeimg.com',
      'cdn.fakercloud.com',
      'soundchain.mypinata.cloud',
      'soundchain-api-dev-uploads.s3.us-east-1.amazonaws.com',
      process.env.UPLOADS_DOMAIN,
    ],
  },
};
