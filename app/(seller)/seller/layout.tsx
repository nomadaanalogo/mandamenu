import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UtensilsCrossed } from 'lucide-react'

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'seller') redirect('/admin')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 shrink-0">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-6">
          <UtensilsCrossed size={15} className="text-white" />
        </div>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center" title="Seller">
          <span className="text-white text-xs font-bold">S</span>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
