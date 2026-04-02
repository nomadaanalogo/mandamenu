import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UtensilsCrossed, Store } from 'lucide-react'
import AdminUserButton from '@/components/admin/AdminUserButton'
import { getUserPlanLimits } from '@/lib/plans'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email    = user.email ?? ''
  const initials = email.slice(0, 2).toUpperCase() || 'U'
  const limits   = await getUserPlanLimits(user.id)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar global — estrecha */}
      <aside className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 shrink-0">
        {/* Logo */}
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-6">
          <UtensilsCrossed size={15} className="text-white" />
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          <Link href="/admin" title="Mis restaurantes"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Store size={18} />
          </Link>
        </nav>

        {/* Usuario */}
        <AdminUserButton email={email} initials={initials} plan={limits} />
      </aside>

      {/* Contenido (puede tener su propio sub-layout) */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
