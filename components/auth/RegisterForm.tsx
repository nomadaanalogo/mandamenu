'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('referral_code', ref)
  }, [searchParams])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="text-lg font-semibold mb-2">Revisá tu email</h2>
        <p className="text-sm text-gray-500">
          Te mandamos un link de confirmación a <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-4">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Nombre</label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
          placeholder="Tu nombre"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          placeholder="tu@email.com"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
          placeholder="Mínimo 6 caracteres"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <button type="submit" disabled={loading}
        className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
      </button>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <a href="/login" className="text-black font-medium hover:underline">Ingresá</a>
      </p>
    </form>
  )
}