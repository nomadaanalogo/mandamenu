'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Check } from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  slug: string
  owner_email: string
  referred_by: string | null
  subscription_status: string
  logo_url: string | null
  primary_color: string | null
}

interface Seller {
  id: string
  email: string
  referral_code: string
}

export default function RestaurantsManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [rRes, sRes] = await Promise.all([
      fetch('/api/superadmin/restaurants'),
      fetch('/api/superadmin/sellers'),
    ])
    setRestaurants(await rRes.json())
    setSellers(await sRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function assignSeller(restaurantId: string, referral_code: string | null) {
    setSaving(restaurantId)
    await fetch(`/api/superadmin/restaurants/${restaurantId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referred_by: referral_code || null }),
    })
    setSaving(null)
    setSaved(restaurantId)
    setTimeout(() => setSaved(null), 2000)
    setRestaurants(prev =>
      prev.map(r => r.id === restaurantId ? { ...r, referred_by: referral_code } : r)
    )
  }

  const statusColors: Record<string, string> = {
    trial: 'bg-yellow-50 text-yellow-700',
    active: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
    'sin plan': 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Restaurantes</h1>
        <p className="text-sm text-gray-400 mt-1">Todos los negocios registrados en MandaMenu</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      ) : restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">Sin restaurantes registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Restaurante</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Dueño</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Seller</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {restaurants.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0"
                        style={{ backgroundColor: r.primary_color ?? undefined }}>
                        {r.logo_url
                          ? <img src={r.logo_url} className="w-7 h-7 object-cover" alt={r.name} />
                          : <span className="text-xs">🍽️</span>}
                      </div>
                      <span className="font-medium text-gray-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{r.owner_email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.subscription_status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.subscription_status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={r.referred_by ?? ''}
                      onChange={e => assignSeller(r.id, e.target.value || null)}
                      disabled={saving === r.id}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 bg-white">
                      <option value="">Sin seller</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.referral_code}>{s.email} ({s.referral_code})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {saved === r.id && <Check size={14} className="text-green-500" />}
                      <a href={`/${r.slug}`} target="_blank"
                        className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
