'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const RESERVED = ['admin', 'superadmin', 'api', 'login', 'register']

export default function NewRestaurantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved'>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [limitError, setLimitError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function handleNameChange(value: string) {
    setName(value)
    const auto = slugify(value)
    setSlug(auto)
    if (auto) checkSlug(auto)
  }

  async function checkSlug(value: string) {
    if (!value) return
    if (RESERVED.includes(value)) { setSlugStatus('reserved'); return }
    setSlugStatus('checking')
    const res = await fetch(`/api/slug/check?slug=${value}`)
    const data = await res.json()
    setSlugStatus(data.available ? 'available' : 'taken')
  }

  function handleSlugChange(value: string) {
    const clean = slugify(value)
    setSlug(clean)
    checkSlug(clean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus !== 'available') return
    setLoading(true)
    setError('')
    setLimitError('')

    // Verificar límite de plan
    const checkRes = await fetch('/api/plans/check?type=restaurant')
    const checkData = await checkRes.json()
    if (!checkData.allowed) {
      setLimitError(checkData.reason)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const referredBy = localStorage.getItem('referral_code') ?? null

    const { data: restaurant, error: rError } = await supabase
      .from('restaurants')
      .insert({ owner_id: user!.id, name, slug, referred_by: referredBy })
      .select()
      .single()

    if (rError) { setError(rError.message); setLoading(false); return }

    // crear sede por defecto
    await supabase.from('locations').insert({
      restaurant_id: restaurant.id,
      name: 'Principal',
      whatsapp,
    })

    // crear o verificar suscripción trial a nivel usuario
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('owner_id', user!.id)
      .single()

    if (!existingSub) {
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'Trial')
        .single()

      if (plan) {
        await supabase.from('subscriptions').insert({
          owner_id: user!.id,
          plan_id: plan.id,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    }

    localStorage.removeItem('referral_code')
    router.push(`/admin/restaurants/${restaurant.id}/menu`)
    router.refresh()
  }

  const slugColor = {
    idle: 'text-gray-400',
    checking: 'text-gray-400',
    available: 'text-green-600',
    taken: 'text-red-500',
    reserved: 'text-red-500',
  }[slugStatus]

  const slugMsg = {
    idle: '',
    checking: 'Verificando...',
    available: 'Disponible',
    taken: 'Ya está en uso',
    reserved: 'Nombre reservado',
  }[slugStatus]

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Volver</a>
        <h1 className="text-2xl font-bold mt-2">Nuevo restaurante</h1>
      </div>

      {limitError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Límite de plan alcanzado</p>
            <p className="text-sm text-amber-700 mt-0.5">{limitError}</p>
          </div>
          <a href="/admin/upgrade" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Ver planes <ArrowUpRight size={12} />
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-5">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nombre del restaurante</label>
          <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
            required placeholder="Ej: El Parrillón"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">URL de tu menú</label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
            <span className="bg-gray-50 text-gray-400 text-sm px-3 py-2 border-r border-gray-300">
              mandamenu.com/
            </span>
            <input type="text" value={slug} onChange={(e) => handleSlugChange(e.target.value)}
              required placeholder="el-parrillon"
              className="flex-1 px-3 py-2 text-sm focus:outline-none" />
          </div>
          {slugMsg && <p className={`text-xs ${slugColor}`}>{slugMsg}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">WhatsApp</label>
          <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
            required placeholder="573001234567 (con código de país)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          <p className="text-xs text-gray-400">Sin +, sin espacios. Ej: 573001234567</p>
        </div>

        <button type="submit" disabled={loading || slugStatus !== 'available'}
          className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
          {loading ? 'Creando restaurante...' : 'Crear restaurante'}
        </button>
      </form>
    </div>
  )
}
