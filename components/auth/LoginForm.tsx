'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function LoginForm() {
  const [view, setView] = useState<'login' | 'forgot'>('login')

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Forgot
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent]     = useState(false)
  const [forgotError, setForgotError]   = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
    router.push('/admin')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true); setForgotError('')
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    if (error) { setForgotError('No se pudo enviar el email. Verificá la dirección.'); return }
    setForgotSent(true)
  }

  if (view === 'forgot') {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => { setView('login'); setForgotSent(false); setForgotError('') }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 -mt-1 w-fit">
          <ArrowLeft size={14} /> Volver
        </button>

        {forgotSent ? (
          <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl leading-relaxed">
            Te enviamos un email a <strong>{forgotEmail}</strong>. Revisá tu bandeja y seguí el link para crear una nueva contraseña.
          </div>
        ) : (
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            {forgotError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{forgotError}</div>}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tu email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                placeholder="tu@email.com"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>

            <button type="submit" disabled={forgotLoading}
              className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {forgotLoading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          placeholder="tu@email.com"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Contraseña</label>
          <button type="button" onClick={() => { setView('forgot'); setForgotEmail(email) }}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          placeholder="••••••••"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <button type="submit" disabled={loading}
        className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>

      <p className="text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <a href="/register" className="text-black font-medium hover:underline">Registrate</a>
      </p>
    </form>
  )
}