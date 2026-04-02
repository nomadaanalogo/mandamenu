import { createClient } from '@/lib/supabase/server'
import CategoryManager from '@/components/admin/CategoryManager'

export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      products(
        *,
        product_extra_groups(
          extra_groups(*, extra_options(*))
        )
      ),
      category_extra_groups(
        extra_groups(*, extra_options(*))
      )
    `)
    .eq('restaurant_id', id)
    .order('sort_order')

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">Menú</h1>
      <CategoryManager restaurantId={id} initialCategories={categories ?? []} />
    </div>
  )
}
