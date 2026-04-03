import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, Users } from 'lucide-react'
import Image from 'next/image'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'superadmin') redirect('/admin')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 shrink-0">
        <div className="mb-6">
          <Image src="/logo.png" alt="MandaMenu" width={28} height={28} className="object-contain" />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1">
          <Link href="/superadmin/restaurants" title="Restaurantes"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Store size={18} />
          </Link>
          <Link href="/superadmin/sellers" title="Sellers"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Users size={18} />
          </Link>
        </nav>

        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center" title="Super Admin">
          <span className="text-white text-xs font-bold">SA</span>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
