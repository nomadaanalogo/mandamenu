import { createClient } from '@/lib/supabase/server'
import VentasBoard from '@/components/admin/VentasBoard'

export default async function VentasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('restaurant_id', id)

  const locationIds = locations?.map((l) => l.id) ?? []

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">Ventas</h1>
      <VentasBoard locationIds={locationIds} locations={locations ?? []} />
    </div>
  )
}
