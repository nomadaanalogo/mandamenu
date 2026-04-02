import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuPublic from '@/components/menu/MenuPublic'

export const dynamic = 'force-dynamic'

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