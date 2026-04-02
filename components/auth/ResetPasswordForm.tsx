'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check } from 'lucide-react'

export default function ResetPasswordForm() {
  const [ready, setReady]         = useState(false)
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // El callback del servidor ya intercambió el código por sesión.
  // Solo verificamos que haya una sesión activa para mostrar el form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setError('El link expiró o ya fue usado. Pedí uno nuevo.')
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPw.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setLoading(false)

    if (error) { setError(error.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/admin'), 2000)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-green-600">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check size={24} strokeWidth={2.5} />
        </div>
        <p className="text-sm font-medium text-gray-700">Contraseña actualizada. Redirigiendo…</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
        {!error && <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />}
        {error
          ? <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-red-500 text-center">{error}</p>
              <a href="/login" className="text-sm text-black font-medium hover:underline">Volver al login</a>
            </div>
          : <p className="text-sm">Verificando link…</p>
        }
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
        <input
          type="password"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          required
          placeholder="Repetí la contraseña"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <button type="submit" disabled={loading || !newPw || !confirmPw}
        className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
