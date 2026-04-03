import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://mandamenu.com'

  // Páginas estáticas
  const static_pages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${base}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Menús públicos de restaurantes (slug pages)
  try {
    const supabase = await createClient()
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('slug, updated_at')

    const restaurant_pages: MetadataRoute.Sitemap = (restaurants ?? []).map((r) => ({
      url: `${base}/${r.slug}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...static_pages, ...restaurant_pages]
  } catch {
    return static_pages
  }
}
