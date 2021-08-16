module.exports = {
  reactStrictMode: true,
  images: {
    domains: [`${process.env.UPLOADS_BUCKET_NAME}.s3.${process.env.UPLOADS_BUCKET_REGION}.amazonaws.com`],
  },
};
