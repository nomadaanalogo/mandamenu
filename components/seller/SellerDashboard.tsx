'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Restaurant {
  id: string
  name: string
  slug: string
  owner_email: string
  status: string
  plan_name: string
  plan_price: number
}

export default function SellerDashboard({
  referralCode,
  email,
  restaurants,
}: {
  referralCode: string
  email: string
  restaurants: Restaurant[]
}) {
  const [copied, setCopied] = useState(false)

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${referralCode}`
    : `https://mandamenu.com?ref=${referralCode}`

  function copyLink() {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const activeCount = restaurants.filter(r => r.status === 'active').length
  const trialCount  = restaurants.filter(r => r.status === 'trial').length

  const statusColors: Record<string, string> = {
    active:    'bg-green-50 text-green-700',
    trial:     'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-600',
    'sin plan':'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de seller</h1>
          <p className="text-sm text-gray-400 mt-1">{email}</p>
        </div>
        <button onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={15} />
          Salir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total referidos', value: restaurants.length },
          { label: 'Activos', value: activeCount },
          { label: 'En trial', value: trialCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Link de referido */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Tu link de referido</p>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <span className="flex-1 text-sm text-gray-600 font-mono truncate">{referralUrl}</span>
          <button onClick={copyLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 shrink-0 transition-colors">
            {copied
              ? <><Check size={13} className="text-green-500" /> Copiado</>
              : <><Copy size={13} /> Copiar</>
            }
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Código: <span className="font-mono font-semibold text-gray-600">{referralCode}</span>
        </p>
      </div>

      {/* Tabla de restaurantes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800 text-sm">Restaurantes referidos</h2>
        </div>

        {restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <p className="text-gray-400 text-sm">Todavía no referiste ningún restaurante.</p>
            <p className="text-gray-400 text-sm mt-1">Compartí tu link para empezar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Restaurante</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Dueño</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {restaurants.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{r.owner_email}</td>
                  <td className="px-5 py-3 text-gray-600">{r.plan_name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a href={`/${r.slug}`} target="_blank"
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
