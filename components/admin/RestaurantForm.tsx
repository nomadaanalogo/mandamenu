'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Restaurant {
  id: string
  name: string
  slug: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  instagram_handle: string | null
  currency: string
}

export default function RestaurantForm({ restaurant }: { restaurant: Restaurant }) {
  const [name, setName] = useState(restaurant.name)
  const [primaryColor, setPrimaryColor] = useState(restaurant.primary_color || '#000000')
  const [secondaryColor, setSecondaryColor] = useState(restaurant.secondary_color || '#ffffff')
  const [instagram, setInstagram] = useState(restaurant.instagram_handle || '')
  const [currency, setCurrency] = useState(restaurant.currency || 'USD')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(restaurant.logo_url)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    let logo_url = restaurant.logo_url
    setUploadError(null)

    if (logoFile) {
      const fd = new FormData()
      fd.append('file', logoFile)
      fd.append('restaurantId', restaurant.id)
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(`Error al subir imagen: ${json.error}`)
        setSaving(false)
        return
      }
      logo_url = json.url
    }

    await supabase.from('restaurants').update({
      name,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      instagram_handle: instagram || null,
      currency,
      logo_url,
    }).eq('id', restaurant.id)

    setSaving(false)
    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-5">
      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
          Cambios guardados correctamente
        </div>
      )}
      {uploadError && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
          {uploadError}
          <p className="text-xs mt-1 text-red-400">
            Verificá que el bucket <strong>restaurant-assets</strong> exista en Supabase Storage y sea público.
          </p>
        </div>
      )}

      {/* Logo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Logo</label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
              Sin logo
            </div>
          )}
          <label className="cursor-pointer border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Subir imagen
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Nombre */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Nombre del restaurante</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">URL de tu menú</label>
        <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <span className="text-sm text-gray-400">mandamenu.com/</span>
          <span className="text-sm font-medium">{restaurant.slug}</span>
        </div>
        <p className="text-xs text-gray-400">Para cambiar el slug contactá soporte</p>
      </div>

      {/* Colores */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Colores</label>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Color principal</label>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <span className="text-sm font-mono">{primaryColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Color secundario</label>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <span className="text-sm font-mono">{secondaryColor}</span>
            </div>
          </div>
        </div>
        {/* Preview */}
        <div className="rounded-lg p-4 text-center mt-1" style={{ backgroundColor: primaryColor }}>
          <p className="font-bold text-white text-sm">Vista previa — {name}</p>
        </div>
      </div>

      {/* Instagram */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Instagram</label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
          <span className="bg-gray-50 text-gray-400 text-sm px-3 py-2 border-r border-gray-300">@</span>
          <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)}
            placeholder="turestaurante"
            className="flex-1 px-3 py-2 text-sm focus:outline-none" />
        </div>
      </div>

      {/* Moneda */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Moneda</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
          <option value="USD">USD — Dólar</option>
          <option value="COP">COP — Peso colombiano</option>
          <option value="ARS">ARS — Peso argentino</option>
          <option value="MXN">MXN — Peso mexicano</option>
          <option value="CLP">CLP — Peso chileno</option>
          <option value="PEN">PEN — Sol peruano</option>
        </select>
      </div>

      <button type="submit" disabled={saving}
        className="bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}