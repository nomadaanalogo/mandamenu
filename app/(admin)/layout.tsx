import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store } from 'lucide-react'
import Image from 'next/image'
import AdminUserButton from '@/components/admin/AdminUserButton'
import { getUserPlanLimits } from '@/lib/plans'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userData }, { data: sub }, limits] = await Promise.all([
    supabase.from('users').select('role').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status, trial_ends_at').eq('owner_id', user.id).single(),
    getUserPlanLimits(user.id),
  ])

  // Redirigir si no es admin
  if (userData?.role === 'seller') redirect('/seller')
  if (userData?.role === 'superadmin') redirect('/superadmin')

  // Trial expirado
  if (sub?.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
    redirect('/admin/upgrade')
  }

  const email    = user.email ?? ''
  const initials = email.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 shrink-0">
        <div className="mb-6">
          <Image src="/logo.png" alt="MandaMenu" width={28} height={28} className="object-contain" />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1">
          <Link href="/admin" title="Mis restaurantes"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Store size={18} />
          </Link>
        </nav>

        <AdminUserButton email={email} initials={initials} plan={limits} />
      </aside>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
