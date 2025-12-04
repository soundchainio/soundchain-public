/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://soundchain.fm',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/api/*', '/server-sitemap.xml'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
}
