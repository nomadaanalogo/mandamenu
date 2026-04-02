import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuPublic from '@/components/menu/MenuPublic'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, logo_url')
    .eq('slug', slug)
    .single()

  if (!restaurant) return {}

  const title = `${restaurant.name} — Menú digital`
  const description = `Mirá el menú de ${restaurant.name} y hacé tu pedido de forma fácil y rápida.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(restaurant.logo_url && { images: [{ url: restaurant.logo_url }] }),
    },
  }
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*, locations(*)')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const { data: categories } = await supabase
  .from('categories')
  .select(`
    *,
    category_extra_groups(
      extra_groups(*, extra_options(*))
    ),
    products(
      *,
      product_extra_groups(
        extra_groups(*, extra_options(*))
      )
    )
  `)
  .eq('restaurant_id', restaurant.id)
  .eq('is_active', true)
  .order('sort_order')

  const featured = categories
    ?.flatMap((c) => c.products)
    .filter((p) => p.is_featured && p.is_available) ?? []

  return (
    <MenuPublic
      restaurant={restaurant}
      categories={categories ?? []}
      featured={featured}
      location={restaurant.locations?.[0]}
    />
  )
}