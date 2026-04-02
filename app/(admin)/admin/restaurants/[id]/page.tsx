import { createClient } from '@/lib/supabase/server'
import RestaurantForm from '@/components/admin/RestaurantForm'

export default async function RestaurantConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-bold text-gray-900 mb-6">Configurar</h1>
      <RestaurantForm restaurant={restaurant} />
    </div>
  )
}
