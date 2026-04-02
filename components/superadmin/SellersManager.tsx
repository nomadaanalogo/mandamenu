'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Copy, Check, X, Users } from 'lucide-react'

interface Seller {
  id: string
  email: string
  referral_code: string
  restaurants_count: number
}

export default function SellersManager() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/sellers')
    const data = await res.json()
    setSellers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function generateCode(emailValue: string) {
    const base = emailValue.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
    const suffix = Math.floor(Math.random() * 900 + 100)
    return `${base}${suffix}`
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    if (value.includes('@')) setCode(generateCode(value))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/superadmin/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, referral_code: code }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setEmail('')
    setCode('')
    load()
  }

  function copyLink(referral_code: string) {
    const url = `${window.location.origin}?ref=${referral_code}`
    navigator.clipboard.writeText(url)
    setCopied(referral_code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
          <p className="text-sm text-gray-400 mt-1">Afiliados que refieren restaurantes</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus size={15} />
          Nuevo seller
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      ) : sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Sin sellers todavía</p>
          <p className="text-sm text-gray-400">Creá el primero para empezar a rastrear referidos</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Código</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Restaurantes</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Link de referido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sellers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-700">{s.email}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">
                      {s.referral_code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.restaurants_count}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => copyLink(s.referral_code)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                      {copied === s.referral_code
                        ? <><Check size={12} className="text-green-500" /> Copiado</>
                        : <><Copy size={12} /> Copiar link</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear seller */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Nuevo seller</h2>
              <button onClick={() => { setShowModal(false); setError('') }}
                className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email del usuario</label>
                <input type="email" value={email} onChange={e => handleEmailChange(e.target.value)}
                  required placeholder="seller@email.com"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                <p className="text-xs text-gray-400">Debe tener cuenta registrada en MandaMenu</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Código de referido</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  required placeholder="JUAN123"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black" />
                <p className="text-xs text-gray-400">El link será: mandamenu.com?ref={code || 'CODIGO'}</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setError('') }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Creando...' : 'Crear seller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
