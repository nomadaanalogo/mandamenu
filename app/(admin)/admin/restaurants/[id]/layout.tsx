import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RestaurantSidebar from '@/components/admin/RestaurantSidebar'
import SidebarWrapper from '@/components/admin/SidebarWrapper'

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, logo_url')
    .eq('id', id)
    .single()

  if (!restaurant) notFound()

  return (
    <SidebarWrapper sidebar={<RestaurantSidebar restaurant={restaurant} />}>
      {children}
    </SidebarWrapper>
  )
}
