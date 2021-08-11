module.exports = {
  reactStrictMode: true,
  images: {
    domains: [
      `${process.env.NEXT_PUBLIC_UPLOADS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_UPLOADS_BUCKET_REGION}.amazonaws.com`,
    ],
  },
};
