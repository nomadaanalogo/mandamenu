import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/superadmin', '/seller', '/panel', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://mandamenu.com/sitemap.xml',
  }
}
