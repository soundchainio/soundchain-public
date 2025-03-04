module.exports = {
  // ... other configurations
  redirects() { // Removed async keyword
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true, // 301 redirect (permanent)
      },
    ];
  },
  // ... other configurations
};
