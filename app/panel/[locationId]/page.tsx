import { createClient } from '@/lib/supabase/server'
import PanelBoard from '@/components/panel/PanelBoard'
import { notFound } from 'next/navigation'

export default async function PanelPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('id, name, panel_pin, restaurant_id')
    .eq('id', locationId)
    .single()

  if (!location || !location.panel_pin) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select(`
      id, name,
      category_extra_groups(extra_groups(id, name, is_required, is_multiple, extra_options(id, name, price_add))),
      products(
        id, name, price, description, is_available,
        product_extra_groups(extra_groups(id, name, is_required, is_multiple, extra_options(id, name, price_add)))
      )
    `)
    .eq('restaurant_id', location.restaurant_id)
    .eq('is_active', true)
    .order('sort_order')

  return (
    <PanelBoard
      locationId={locationId}
      locationName={location.name}
      categories={(categories ?? []) as any}
    />
  )
}
