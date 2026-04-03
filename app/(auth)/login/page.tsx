import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role === 'seller') redirect('/seller')
    if (userData?.role === 'superadmin') redirect('/superadmin')
    redirect('/admin')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Bienvenido</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresá a tu panel de MandaMenu</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
