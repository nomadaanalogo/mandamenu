'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PaymentMethodModal, { PAYMENT_CONFIG } from '@/components/ui/PaymentMethodModal'

// ── tipos ─────────────────────────────────────────────────────────────────────
interface OrderItem { product_name: string; quantity: number; unit_price: number }
interface Order {
  id: string; status: 'delivered' | 'cancelled'
  order_type: 'table' | 'pickup' | 'delivery'
  total: number; cancel_reason: string | null
  payment_method: string | null
  customer_name: string | null; customer_phone: string | null
  created_at: string; location_id: string
  order_items: OrderItem[]
}
interface Location { id: string; name: string }
type Range = 'today' | 'week' | 'month' | 'custom'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })
const toLocalDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA')

function getRangeDates(range: Range, customStart: string, customEnd: string) {
  const today = new Date().toLocaleDateString('en-CA')
  if (range === 'today') return { start: today, end: today }
  if (range === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6)
    return { start: d.toLocaleDateString('en-CA'), end: today }
  }
  if (range === 'month') {
    const d = new Date(); d.setDate(1)
    return { start: d.toLocaleDateString('en-CA'), end: today }
  }
  return { start: customStart || today, end: customEnd || today }
}

// ── componente principal ──────────────────────────────────────────────────────
export default function VentasBoard({ locationIds, locations }: {
  locationIds: string[]; locations: Location[]
}) {
  const supabase = createClient()
  const [range, setRange]             = useState<Range>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [orders, setOrders]           = useState<Order[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [showOrderList, setShowOrderList] = useState(false)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!locationIds.length) { setLoading(false); return }
    setLoading(true)
    const { start, end } = getRangeDates(range, customStart, customEnd)
    const { data } = await supabase
      .from('orders')
      .select('id, status, order_type, total, cancel_reason, payment_method, customer_name, customer_phone, created_at, location_id, order_items(product_name, quantity, unit_price)')
      .in('location_id', locationIds)
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59.999`)
      .order('created_at', { ascending: true })
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [range, customStart, customEnd, locationIds.join(',')])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function updatePaymentMethod(orderId: string, method: string) {
    await supabase.from('orders').update({ payment_method: method }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_method: method } : o))
    setEditingPayment(null)
  }

  const filtered   = orders.filter(o => selectedLocation === 'all' || o.location_id === selectedLocation)
  const delivered  = filtered.filter(o => o.status === 'delivered')
  const cancelled  = filtered.filter(o => o.status === 'cancelled')

  const totalRevenue = delivered.reduce((s, o) => s + o.total, 0)
  const totalOrders  = delivered.length
  const byType = {
    table:    delivered.filter(o => o.order_type === 'table'),
    pickup:   delivered.filter(o => o.order_type === 'pickup'),
    delivery: delivered.filter(o => o.order_type === 'delivery'),
  }

  const byPayment = {
    cash:     delivered.filter(o => o.payment_method === 'cash'),
    card:     delivered.filter(o => o.payment_method === 'card'),
    transfer: delivered.filter(o => o.payment_method === 'transfer'),
    pending:  delivered.filter(o => o.payment_method === 'pending' || !o.payment_method),
  }

  // productos
  const productMap = new Map<string, { qty: number; revenue: number }>()
  for (const order of delivered)
    for (const item of order.order_items) {
      const prev = productMap.get(item.product_name) ?? { qty: 0, revenue: 0 }
      productMap.set(item.product_name, { qty: prev.qty + item.quantity, revenue: prev.revenue + item.unit_price * item.quantity })
    }
  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty).slice(0, 8)

  // gráfico
  const isToday = range === 'today'
  const chartData: { label: string; value: number }[] = []
  if (isToday) {
    for (let h = 0; h < 24; h++) {
      chartData.push({ label: `${h}`, value: delivered.filter(o => new Date(o.created_at).getHours() === h).reduce((s, o) => s + o.total, 0) })
    }
  } else {
    const { start, end } = getRangeDates(range, customStart, customEnd)
    const cur = new Date(start + 'T12:00:00'), endD = new Date(end + 'T12:00:00')
    while (cur <= endD) {
      const dateStr = cur.toLocaleDateString('en-CA')
      chartData.push({ label: cur.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }), value: delivered.filter(o => toLocalDate(o.created_at) === dateStr).reduce((s, o) => s + o.total, 0) })
      cur.setDate(cur.getDate() + 1)
    }
  }
  const maxChart = Math.max(...chartData.map(d => d.value), 1)

  // cancelados
  const cancelReasons = new Map<string, number>()
  for (const o of cancelled) cancelReasons.set(o.cancel_reason?.trim() || 'Sin motivo', (cancelReasons.get(o.cancel_reason?.trim() || 'Sin motivo') ?? 0) + 1)
  const cancelList = [...cancelReasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-5 max-w-5xl">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {([['today','Hoy'],['week','7 días'],['month','Este mes'],['custom','Personalizado']] as [Range,string][]).map(([key, label]) => (
            <button key={key} onClick={() => setRange(key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${range === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm" />
            <span className="text-gray-300">→</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm" />
          </>
        )}
        {locations.length > 1 && (
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm ml-auto">
            <option value="all">Todas las sedes</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <button onClick={() => setShowOrderList(true)}
          className="ml-auto border border-green-300 bg-white text-green-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-green-50 shadow-sm flex items-center gap-1.5 shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 2.5h11M1 6.5h11M1 10.5h6"/>
          </svg>
          Ver pedidos
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-6 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Hero ── */}
          <div className="bg-gray-900 text-white rounded-2xl p-6 flex flex-wrap gap-8 items-end">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total recaudado</p>
              <p className="text-4xl font-bold leading-none">${fmt(totalRevenue)}</p>
            </div>
            <div className="flex gap-8 pb-0.5">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Pedidos</p>
                <p className="text-xl font-semibold">{totalOrders}</p>
              </div>
              {cancelled.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Cancelados</p>
                  <p className="text-xl font-semibold text-red-400">{cancelled.length}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Desglose por tipo y pago ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Por tipo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Por canal</p>
              <div className="flex flex-col divide-y divide-gray-50">
                {[
                  { label: 'Mesa',      icon: '🪑', orders: byType.table },
                  { label: 'Retiro',    icon: '🛍️', orders: byType.pickup },
                  { label: 'Domicilio', icon: '🛵', orders: byType.delivery },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-base leading-none">{t.icon}</span>
                      {t.label}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">${fmt(t.orders.reduce((s, o) => s + o.total, 0))}</span>
                      <span className="text-xs text-gray-400 ml-2">{t.orders.length} ped.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por pago */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Por medio de pago</p>
              <div className="flex flex-col divide-y divide-gray-50">
                {[
                  { label: 'Efectivo',      icon: '💵', orders: byPayment.cash },
                  { label: 'Tarjeta',       icon: '💳', orders: byPayment.card },
                  { label: 'Transferencia', icon: '🔄', orders: byPayment.transfer },
                  { label: 'Sin registrar', icon: '⏳', orders: byPayment.pending },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-base leading-none">{t.icon}</span>
                      {t.label}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">${fmt(t.orders.reduce((s, o) => s + o.total, 0))}</span>
                      <span className="text-xs text-gray-400 ml-2">{t.orders.length} ped.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Gráfico + Productos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Gráfico */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-1">Ventas {isToday ? 'por hora' : 'por día'}</p>
              <p className="text-xs text-gray-400 mb-4">{isToday ? 'Ingresos acumulados por cada hora del día' : 'Ingresos por día en el período seleccionado'}</p>
              {totalOrders === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs text-gray-300">Sin ventas en este período</p>
                </div>
              ) : (
                <div className="flex items-end gap-0.5 h-40 pt-2">
                  {chartData.map((d, i) => (
                    <div key={i} title={d.value > 0 ? `$${fmt(d.value)}` : undefined}
                      className="group flex flex-col items-center flex-1 min-w-0 cursor-default">
                      <div className="w-full rounded-t transition-all group-hover:opacity-80"
                        style={{
                          height: `${Math.max((d.value / maxChart) * 144, d.value > 0 ? 3 : 0)}px`,
                          backgroundColor: d.value > 0 ? '#6366f1' : '#f3f4f6',
                        }} />
                      {chartData.length <= 14 && (
                        <span className="text-[9px] text-gray-400 truncate w-full text-center mt-1">
                          {d.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Productos más vendidos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-1">Productos más vendidos</p>
              <p className="text-xs text-gray-400 mb-4">Por cantidad de unidades entregadas</p>
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <span className="text-3xl">🍽️</span>
                  <p className="text-xs text-gray-300">Sin datos en este período</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {topProducts.map((p, i) => {
                    const maxQty = topProducts[0].qty
                    const pct = (p.qty / maxQty) * 100
                    const colors = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe','#f5f3ff','#faf5ff']
                    return (
                      <div key={p.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 truncate max-w-[55%] flex items-center gap-1.5">
                            <span className="text-gray-300 font-normal tabular-nums">#{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="text-gray-400 shrink-0">
                            <span className="font-semibold text-gray-700">{p.qty}</span> uds · <span className="font-semibold text-gray-700">${fmt(p.revenue)}</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[i] ?? '#6366f1' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Cancelados detalle ── */}
          {cancelled.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-800">Motivos de cancelación</p>
                <span className="text-xs bg-red-50 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                  {cancelled.length} {cancelled.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {cancelList.map((c, i) => {
                  const pct = (c.count / cancelled.length) * 100
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{c.reason}</span>
                        <span className="text-red-400 font-semibold">{c.count} {c.count === 1 ? 'vez' : 'veces'}</span>
                      </div>
                      <div className="h-1.5 bg-red-50 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-red-300 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Panel lista de pedidos ── */}
      {showOrderList && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowOrderList(false); setEditingPayment(null) }} />
          <div className="relative ml-auto w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-base">Pedidos del período</h2>
                <p className="text-xs text-gray-400 mt-0.5">{delivered.length} entregados · {cancelled.length} cancelados</p>
              </div>
              <button onClick={() => { setShowOrderList(false); setEditingPayment(null) }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <span className="text-3xl">🍽️</span>
                  <p className="text-sm text-gray-300">Sin pedidos en este período</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Cliente</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Total</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...filtered].reverse().map(order => {
                      const pm = order.payment_method
                      const cfg = pm && pm !== 'pending' ? PAYMENT_CONFIG[pm] : null
                      return (
                        <tr key={order.id} className={`hover:bg-gray-50 ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                            #{order.id.slice(0, 6).toUpperCase()}
                          </td>
                          <td className="px-3 py-3 min-w-0">
                            <p className="font-medium text-gray-800 truncate max-w-36">{order.customer_name || 'Sin nombre'}</p>
                            {order.customer_phone && (
                              <p className="text-xs text-gray-400">{order.customer_phone}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                            ${fmt(order.total)}
                          </td>
                          <td className="px-3 py-3">
                            {order.status === 'cancelled' ? (
                              <span className="text-xs text-gray-400">Cancelado</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {cfg && (
                                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium w-fit ${cfg.bg} ${cfg.text}`}>
                                    {cfg.icon} {cfg.label}
                                  </span>
                                )}
                                <button onClick={() => setEditingPayment(order.id)}
                                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline text-left">
                                  Cambiar medio de pago
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {editingPayment && (() => {
        const o = filtered.find(x => x.id === editingPayment)
        if (!o) return null
        return (
          <PaymentMethodModal
            title="Cambiar medio de pago"
            subtitle={`Pedido #${o.id.slice(0, 6).toUpperCase()} · $${fmt(o.total)}`}
            includePending={false}
            onConfirm={(method) => updatePaymentMethod(editingPayment, method)}
            onCancel={() => setEditingPayment(null)}
          />
        )
      })()}
    </div>
  )
}
