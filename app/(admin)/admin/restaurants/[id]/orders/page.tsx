import { createClient } from '@/lib/supabase/server'
import OrdersBoard from '@/components/orders/OrdersBoard'

export default async function OrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('restaurant_id', id)

  const locationIds = locations?.map((l) => l.id) ?? []

  // Solo cargamos los pedidos de hoy — fechas anteriores se fetchan desde el cliente
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en timezone local
  const [{ data: orders }, { data: categories }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(*, order_item_extras(*))')
      .in('location_id', locationIds.length ? locationIds : [''])
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59.999`)
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select(`
        id, name,
        category_extra_groups(extra_groups(id, name, is_required, is_multiple, extra_options(id, name, price_add))),
        products(
          id, name, price, description, is_available,
          product_extra_groups(extra_groups(id, name, is_required, is_multiple, extra_options(id, name, price_add)))
        )
      `)
      .eq('restaurant_id', id)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">Pedidos</h1>
      <OrdersBoard
        initialOrders={orders ?? []}
        restaurantId={id}
        locationIds={locationIds}
        locations={locations ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
