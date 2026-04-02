'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'react-qr-code'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ArrowUpRight } from 'lucide-react'

interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  whatsapp: string
  schedule: string | null
  is_active: boolean
  panel_pin: string | null
  allows_table: boolean
  allows_pickup: boolean
  allows_delivery: boolean
}

export default function LocationsManager({
  restaurantId,
  initialLocations,
  slug,
}: {
  restaurantId: string
  initialLocations: Location[]
  slug: string
}) {
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pinEditingId, setPinEditingId] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [qrLocation, setQrLocation] = useState<Location | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [limitError, setLimitError] = useState('')
  const supabase = createClient()

  async function handleSave(data: Partial<Location>, id?: string) {
    if (id) {
      const { data: updated } = await supabase
        .from('locations')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (updated) setLocations(locations.map((l) => l.id === id ? updated : l))
      setEditingId(null)
    } else {
      // Verificar límite de plan antes de crear
      const checkRes = await fetch(`/api/plans/check?type=location&restaurantId=${restaurantId}`)
      const checkData = await checkRes.json()
      if (!checkData.allowed) {
        setLimitError(checkData.reason)
        setShowAdd(false)
        return
      }
      const { data: created } = await supabase
        .from('locations')
        .insert({ ...data, restaurant_id: restaurantId })
        .select()
        .single()
      if (created) setLocations([...locations, created])
      setShowAdd(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('locations').update({ is_active: !current }).eq('id', id)
    setLocations(locations.map((l) => l.id === id ? { ...l, is_active: !current } : l))
  }

  async function savePin(locationId: string) {
    if (!newPin.trim()) return
    setSavingPin(true)
    await supabase.from('locations').update({ panel_pin: newPin.trim() }).eq('id', locationId)
    setLocations(locations.map((l) => l.id === locationId ? { ...l, panel_pin: newPin.trim() } : l))
    setPinEditingId(null)
    setNewPin('')
    setSavingPin(false)
  }

  async function deleteLocation(id: string) {
    setConfirmDelete(id)
  }

  async function confirmDoDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    await supabase.from('locations').delete().eq('id', confirmDelete)
    setLocations((prev) => prev.filter((l) => l.id !== confirmDelete))
    setConfirmDelete(null)
    setDeleting(false)
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {limitError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Límite de plan alcanzado</p>
            <p className="text-sm text-amber-700 mt-0.5">{limitError}</p>
          </div>
          <a href="/admin/upgrade" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Ver planes <ArrowUpRight size={12} />
          </a>
        </div>
      )}
      {locations.map((loc) => (
        <div key={loc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {editingId === loc.id ? (
            <div className="p-5">
              <LocationForm
                initial={loc}
                onSave={(data) => handleSave(data, loc.id)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Inicial */}
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 shrink-0">
                  {loc.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{loc.name}</h3>
                    {!loc.is_active && (
                      <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full shrink-0">Inactiva</span>
                    )}
                  </div>
                  {(loc.city || loc.schedule) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {[loc.city, loc.schedule].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Acciones icono */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setEditingId(loc.id)} title="Editar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M10.5 2.5l2 2L5 12H3v-2l7.5-7.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => toggleActive(loc.id, loc.is_active)}
                    title={loc.is_active ? 'Desactivar sede' : 'Activar sede'}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    {loc.is_active ? (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M5 7.5l2 2 3-3"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="7.5" cy="7.5" r="6"/><path d="M9.5 5.5l-4 4M5.5 5.5l4 4"/>
                      </svg>
                    )}
                  </button>
                  <button onClick={() => deleteLocation(loc.id)} title="Eliminar sede"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8h3l.5-8"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Tipos de pedido ── */}
              <div className="px-5 pb-3 flex gap-1.5">
                {loc.allows_table    && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">🪑 Mesa</span>}
                {loc.allows_pickup   && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">🛍️ Recoger</span>}
                {loc.allows_delivery && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">🛵 Domicilio</span>}
              </div>

              {/* ── Info ── */}
              {(loc.address || loc.phone || loc.whatsapp) && (
                <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {loc.address && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5.5 1C3.57 1 2 2.57 2 4.5c0 2.75 3.5 6 3.5 6S9 7.25 9 4.5C9 2.57 7.43 1 5.5 1z" strokeLinejoin="round"/>
                        <circle cx="5.5" cy="4.5" r="1.25"/>
                      </svg>
                      {loc.address}
                    </span>
                  )}
                  {loc.phone && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 2h2.5l1 2.5-1.5 1a6 6 0 002.5 2.5l1-1.5L10 7.5V10a1 1 0 01-1 1A9 9 0 011 3a1 1 0 011-1z"/>
                      </svg>
                      {loc.phone}
                    </span>
                  )}
                  {loc.whatsapp && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      {loc.whatsapp}
                    </span>
                  )}
                </div>
              )}

              {/* ── Footer ── */}
              <div className="border-t border-gray-100 divide-y divide-gray-100">

                {/* Bloque clientes */}
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-sm">🔗</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">Link del menú</p>
                    <p className="text-[11px] text-gray-400 truncate font-mono mt-0.5">
                      mandamenu.com/{slug}?sede=…{loc.id.slice(-4)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setQrLocation(loc)}
                      className="text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 font-medium">
                      QR
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(`https://mandamenu.com/${slug}?sede=${loc.id}`)}
                      className="text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 font-medium">
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Bloque empleados */}
                <div className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-sm mt-0.5">👨‍🍳</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">Panel de empleados</p>
                    {loc.panel_pin ? (
                      <p className="text-[11px] text-gray-400 truncate font-mono mt-0.5">
                        mandamenu.com/panel/{loc.id.slice(-8)}…
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-500 mt-0.5">Sin PIN configurado</p>
                    )}

                    {/* PIN edit inline */}
                    {pinEditingId === loc.id && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="Nuevo PIN (ej: 1234)"
                          maxLength={10}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                        />
                        <button onClick={() => savePin(loc.id)} disabled={savingPin || !newPin.trim()}
                          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg disabled:opacity-50 font-medium">
                          {savingPin ? '...' : 'Guardar'}
                        </button>
                        <button onClick={() => setPinEditingId(null)}
                          className="text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {pinEditingId !== loc.id && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setPinEditingId(loc.id); setNewPin('') }}
                        className="text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 font-medium">
                        {loc.panel_pin ? 'PIN' : 'Config. PIN'}
                      </button>
                      {loc.panel_pin && (
                        <button onClick={() => navigator.clipboard.writeText(`https://mandamenu.com/panel/${loc.id}`)}
                          className="text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 font-medium">
                          Copiar
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      ))}

      {showAdd ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">Nueva sede</h3>
          <LocationForm
            onSave={(data) => handleSave(data)}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 w-fit">
          + Nueva sede
        </button>
      )}

      {/* ── Modal QR ── */}
      {qrLocation && (
        <QRModal loc={qrLocation} slug={slug} onClose={() => setQrLocation(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar esta sede?"
          description="Esta acción no se puede deshacer."
          loading={deleting}
          onConfirm={confirmDoDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function LocationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Location>
  onSave: (data: Partial<Location>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [city, setCity] = useState(initial?.city || '')
  const [address, setAddress] = useState(initial?.address || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp || '')
  const [schedule, setSchedule] = useState(initial?.schedule || '')
  const [allowsTable, setAllowsTable] = useState(initial?.allows_table ?? true)
  const [allowsPickup, setAllowsPickup] = useState(initial?.allows_pickup ?? true)
  const [allowsDelivery, setAllowsDelivery] = useState(initial?.allows_delivery ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !whatsapp.trim()) return
    setSaving(true)
    await onSave({ name, city, address, phone, whatsapp, schedule, allows_table: allowsTable, allows_pickup: allowsPickup, allows_delivery: allowsDelivery })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Nombre *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            required placeholder="Ej: Sede Centro"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Ciudad</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Ej: Bogotá"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Dirección</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="Ej: Calle 10 #5-23"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Teléfono</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 6014567890"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">WhatsApp *</label>
          <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
            required placeholder="573001234567"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Horario de atención</label>
        <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)}
          placeholder="Ej: Lun-Vie 12:00-22:00, Sáb-Dom 12:00-23:00"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600">Tipos de pedido permitidos</label>
        <div className="flex gap-2">
          {([
            { key: 'table',    label: '🪑 Mesa',      value: allowsTable,    set: setAllowsTable },
            { key: 'pickup',   label: '🛍️ Recoger',   value: allowsPickup,   set: setAllowsPickup },
            { key: 'delivery', label: '🛵 Domicilio',  value: allowsDelivery, set: setAllowsDelivery },
          ] as const).map(opt => (
            <button key={opt.key} type="button"
              onClick={() => opt.set(!opt.value)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                opt.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar sede'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function QRModal({ loc, slug, onClose }: { loc: Location; slug: string; onClose: () => void }) {
  const url = `https://mandamenu.com/${slug}?sede=${loc.id}`

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR — ${loc.name}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center;
               justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
        h2 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 12px; color: #666; margin-bottom: 24px; }
        svg { width: 240px; height: 240px; }
      </style></head>
      <body>
        <h2>${loc.name}</h2>
        <p>${url}</p>
        ${document.getElementById('qr-svg-' + loc.id)?.outerHTML ?? ''}
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{loc.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-45">{url}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            ✕
          </button>
        </div>

        <div id={`qr-svg-${loc.id}`} className="bg-white p-3 rounded-xl border border-gray-100">
          <QRCode value={url} size={200} />
        </div>

        <div className="flex gap-2 w-full">
          <button onClick={handlePrint}
            className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800">
            🖨️ Imprimir
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(url)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
            Copiar link
          </button>
        </div>
      </div>
    </div>
  )
}