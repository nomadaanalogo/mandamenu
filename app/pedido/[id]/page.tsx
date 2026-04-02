import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/menu/OrderTracker'

export default async function OrderTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
 .select('*, order_items(*, order_item_extras(*)), locations(whatsapp, restaurants(name, primary_color, logo_url))')
    .eq('id', id)
    .single()
   
  if (!order) notFound()

  return <OrderTracker initialOrder={order} />
}