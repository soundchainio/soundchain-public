module.exports = {
    reactStrictMode: false,
    images: {
        domains: [
            'placeimg.com',
            'cdn.fakercloud.com',
            'soundchain.mypinata.cloud',
            ...(process.env.UPLOADS_DOMAIN ? [process.env.UPLOADS_DOMAIN] : []), // Ensure it's only added if defined
            'soundchain.io', // Add this line
        ],
    },
    async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true, // Sends a 308 Permanent Redirect
      },
    ];
  },
};
