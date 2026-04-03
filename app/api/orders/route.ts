import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { location_id, customer_name, customer_phone, order_type, table_number, delivery_address, items, notes } = body

  const VALID_ORDER_TYPES = ['table', 'pickup', 'delivery']
  if (!location_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (order_type && !VALID_ORDER_TYPES.includes(order_type)) {
    return NextResponse.json({ error: 'Tipo de pedido inválido' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── 1. Validar y obtener precios reales de productos desde la DB ──
  const productIds = [...new Set(items.map((item: any) => item.product_id))]
  const { data: dbProducts, error: productsError } = await supabase
    .from('products')
    .select('id, price')
    .in('id', productIds)

  if (productsError || !dbProducts || dbProducts.length !== productIds.length) {
    return NextResponse.json({ error: 'Uno o más productos no son válidos' }, { status: 400 })
  }

  const productPriceMap = new Map(dbProducts.map((p) => [p.id, p.price]))

  // ── 2. Validar y obtener precios reales de extras desde la DB ──
  const allExtraIds = items
    .flatMap((item: any) => (item.extras ?? []).map((e: any) => e.id))
    .filter(Boolean)

  const extraPriceMap = new Map<string, number>()
  if (allExtraIds.length > 0) {
    const { data: dbExtras } = await supabase
      .from('extra_options')
      .select('id, price_add')
      .in('id', allExtraIds)
    dbExtras?.forEach((e) => extraPriceMap.set(e.id, e.price_add))
  }

  // ── 3. Calcular total usando precios de la DB ──
  const total = items.reduce((sum: number, item: any) => {
    const dbPrice = productPriceMap.get(item.product_id) ?? 0
    const extrasSum = (item.extras ?? []).reduce((s: number, e: any) => {
      return s + (e.id ? (extraPriceMap.get(e.id) ?? 0) : 0)
    }, 0)
    return sum + (dbPrice + extrasSum) * item.quantity
  }, 0)

  // ── 4. Crear el pedido con el total ya calculado ──
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      location_id,
      customer_name,
      customer_phone,
      order_type: order_type || 'table',
      table_number: table_number || null,
      delivery_address: delivery_address || null,
      notes,
      status: 'pending',
      total,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── 5. Insertar items con precios de la DB ──
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.name,
    unit_price: productPriceMap.get(item.product_id),
    quantity: item.quantity,
  }))

  const { data: insertedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select('id')

  if (itemsError || !insertedItems) {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Error al guardar los items' }, { status: 500 })
  }

  // ── 6. Insertar extras con precios de la DB ──
  const orderItemExtras = insertedItems.flatMap((insertedItem, idx) => {
    const extras = items[idx]?.extras ?? []
    return extras.map((e: any) => ({
      order_item_id: insertedItem.id,
      extra_name: e.name,
      extra_price: e.id ? (extraPriceMap.get(e.id) ?? 0) : 0,
    }))
  })

  if (orderItemExtras.length > 0) {
    await supabase.from('order_item_extras').insert(orderItemExtras)
  }

  return NextResponse.json({ order_id: order.id })
}
