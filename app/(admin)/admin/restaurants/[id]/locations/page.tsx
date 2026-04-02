import { createClient } from '@/lib/supabase/server'
import LocationsManager from '@/components/admin/LocationsManager'

export default async function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, slug')
    .eq('id', id)
    .single()

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('restaurant_id', id)
    .order('created_at')

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">Sedes</h1>
      <LocationsManager restaurantId={id} initialLocations={locations ?? []} slug={restaurant?.slug ?? ''} />
    </div>
  )
}
