'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, LayoutList, Columns3, Bell, BellOff, PlusCircle } from 'lucide-react'
import PaymentMethodModal, { PAYMENT_CONFIG } from '@/components/ui/PaymentMethodModal'
import AddItemsToOrderModal, { SimpleCategory } from '@/components/orders/AddItemsToOrderModal'
import CreateOrderModal from '@/components/panel/CreateOrderModal'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface OrderItemExtra { id: string; extra_name: string; extra_price: number }
interface OrderItem {
  id: string; product_name: string; unit_price: number
  quantity: number; order_item_extras: OrderItemExtra[]
}
interface Order {
  id: string; location_id: string
  customer_name: string | null; customer_phone: string | null
  order_type: 'table' | 'pickup' | 'delivery'
  table_number: string | null; delivery_address: string | null
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  total: number; notes: string | null; cancel_reason: string | null
  payment_method: string | null; created_at: string
  order_items: OrderItem[]
}

// ── Constantes ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready',     label: 'Listos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]
const STATUS_CFG: Record<string, { label: string; badge: string; border: string; dot: string }> = {
  pending:   { label: 'Pendiente',  badge: 'bg-amber-50 text-amber-600',  border: 'border-l-amber-400', dot: 'bg-amber-400' },
  preparing: { label: 'Preparando', badge: 'bg-blue-50 text-blue-600',    border: 'border-l-blue-400',  dot: 'bg-blue-500' },
  ready:     { label: 'Listo',      badge: 'bg-green-50 text-green-600',  border: 'border-l-green-400', dot: 'bg-green-500' },
  delivered: { label: 'Entregado',  badge: 'bg-gray-50 text-gray-400',    border: 'border-l-gray-200',  dot: 'bg-gray-300' },
  cancelled: { label: 'Cancelado',  badge: 'bg-red-50 text-red-500',      border: 'border-l-red-300',   dot: 'bg-red-400' },
}
const KANBAN_COLS = [
  { key: 'pending',   label: 'Pendientes', header: 'bg-amber-400', bg: 'bg-amber-50',  border: 'border-l-amber-400' },
  { key: 'preparing', label: 'Preparando', header: 'bg-blue-500',  bg: 'bg-blue-50',   border: 'border-l-blue-400' },
  { key: 'ready',     label: 'Listos',     header: 'bg-green-500', bg: 'bg-green-50',  border: 'border-l-green-400' },
]
const NEXT_STATUS: Record<string, string> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' }
const NEXT_LABEL: Record<string, string>  = { pending: 'Preparar', preparing: 'Marcar listo', ready: 'Entregar' }
const PREV_STATUS: Record<string, string> = { preparing: 'pending', ready: 'preparing' }
const PREV_LABEL: Record<string, string>  = { preparing: 'Volver a pendiente', ready: 'Volver a preparando' }
const TYPE_LABEL: Record<string, string>  = { table: '🪑 Mesa', pickup: '🛍️ Recoger', delivery: '🛵 Domicilio' }
const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })
const toLocalDate = (s: string) => new Date(s).toLocaleDateString('en-CA')
function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (d < 60) return 'ahora'; if (d < 3600) return `${Math.floor(d / 60)}m`; return `${Math.floor(d / 3600)}h`
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PanelBoard({
  locationId,
  locationName,
  categories,
}: {
  locationId: string
  locationName: string
  categories: SimpleCategory[]
}) {
  const SESSION_KEY = `panel_${locationId}`
  const supabase    = createClient()

  // PIN
  const [unlocked, setUnlocked]   = useState(false)
  const [pin, setPin]             = useState('')
  const [pinError, setPinError]   = useState('')
  const [verifying, setVerifying] = useState(false)

  // Orders
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  // UI
  const [activeTab, setActiveTab]     = useState('pending')
  const [viewMode, setViewMode]       = useState<'list' | 'kanban'>('list')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [updating, setUpdating]       = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))

  // Sound
  const [soundMuted, setSoundMuted] = useState(false)
  const soundMutedRef = useRef(false)
  useEffect(() => {
    const saved = localStorage.getItem(`panel-sound-${locationId}`) === 'true'
    setSoundMuted(saved); soundMutedRef.current = saved
  }, [])
  function toggleSound() {
    const next = !soundMuted
    setSoundMuted(next); soundMutedRef.current = next
    localStorage.setItem(`panel-sound-${locationId}`, String(next))
  }
  function playNotificationSound() {
    if (soundMutedRef.current) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65)
        osc.start(t); osc.stop(t + 0.65)
      })
    } catch { /* ignore */ }
  }

  // Modals
  const [editingOrder, setEditingOrder]           = useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder]     = useState<Order | null>(null)
  const [cancelReason, setCancelReason]           = useState('')
  const [cancelling, setCancelling]               = useState(false)
  const [showCreateOrder, setShowCreateOrder]     = useState(false)
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null)
  const [paymentModalTarget, setPaymentModalTarget] = useState<'preparing' | 'delivered'>('preparing')
  const [changingPaymentOrder, setChangingPaymentOrder] = useState<Order | null>(null)

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === 'ok') setUnlocked(true)
  }, [])

  useEffect(() => {
    if (!unlocked) return
    setLoading(true)
    supabase.from('orders').select('*, order_items(*, order_item_extras(*))')
      .eq('location_id', locationId).order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [unlocked])

  useEffect(() => {
    if (!unlocked) return
    const ch = supabase.channel('panel-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        if (payload.new.location_id !== locationId) return
        const { data } = await supabase.from('orders').select('*, order_items(*, order_item_extras(*))')
          .eq('id', payload.new.id).single()
        if (data) {
          setOrders(p => p.some(o => o.id === data.id) ? p.map(o => o.id === data.id ? data : o) : [data, ...p])
          setActiveTab('pending')
          playNotificationSound()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new.location_id !== locationId) return
        setOrders(p => p.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [unlocked])

  // ── Handlers ────────────────────────────────────────────────────────────
  async function verifyPin() {
    if (!pin.trim()) return
    setVerifying(true); setPinError('')
    const res  = await fetch('/api/panel/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, pin }) })
    const data = await res.json()
    if (data.ok) { localStorage.setItem(SESSION_KEY, 'ok'); setUnlocked(true) }
    else setPinError(data.error ?? 'PIN incorrecto')
    setVerifying(false)
  }

  async function updateStatus(orderId: string, newStatus: string, extraFields?: Record<string, string>) {
    setUpdating(orderId)
    await supabase.from('orders').update({ status: newStatus, ...extraFields }).eq('id', orderId)
    setOrders(p => p.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'], ...extraFields } : o))
    setUpdating(null)
  }

  function handleNextStatus(order: Order) {
    if (order.status === 'pending') {
      setPaymentModalTarget('preparing'); setPaymentModalOrder(order)
    } else if (order.status === 'ready' && (!order.payment_method || order.payment_method === 'pending')) {
      setPaymentModalTarget('delivered'); setPaymentModalOrder(order)
    } else {
      updateStatus(order.id, NEXT_STATUS[order.status])
    }
  }

  async function handlePaymentConfirm(method: string) {
    if (!paymentModalOrder) return
    await updateStatus(paymentModalOrder.id, paymentModalTarget, { payment_method: method })
    setPaymentModalOrder(null)
  }

  async function handleChangePaymentConfirm(method: string) {
    if (!changingPaymentOrder) return
    await supabase.from('orders').update({ payment_method: method }).eq('id', changingPaymentOrder.id)
    setOrders(p => p.map(o => o.id === changingPaymentOrder.id ? { ...o, payment_method: method } : o))
    setChangingPaymentOrder(null)
  }

  async function confirmCancel() {
    if (!cancellingOrder) return
    setCancelling(true)
    await supabase.from('orders').update({ status: 'cancelled', cancel_reason: cancelReason.trim() || null }).eq('id', cancellingOrder.id)
    setOrders(p => p.map(o => o.id === cancellingOrder.id ? { ...o, status: 'cancelled', cancel_reason: cancelReason.trim() || null } : o))
    setCancellingOrder(null); setCancelReason(''); setCancelling(false)
  }

  function handleItemsAdded(updatedOrder: Order, newStatus?: 'preparing') {
    setOrders(p => p.map(o => o.id === updatedOrder.id ? updatedOrder : o))
    if (newStatus) updateStatus(updatedOrder.id, newStatus)
    setEditingOrder(null)
  }

  function handleOrderCreated(order: Order) {
    setOrders(p => [order, ...p])
    setShowCreateOrder(false)
    setActiveTab('pending')
  }

  function printOrder(order: Order) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Comanda #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        body { font-family: monospace; font-size: 14px; padding: 20px; max-width: 300px; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .total { font-weight: bold; font-size: 16px; }
      </style></head><body>
      <h2>Comanda #${order.id.slice(0, 8).toUpperCase()}</h2>
      <p>${new Date(order.created_at).toLocaleString()}</p>
      <p>${TYPE_LABEL[order.order_type]}${order.table_number ? ` ${order.table_number}` : ''}</p>
      ${order.customer_name ? `<p>Cliente: ${order.customer_name}</p>` : ''}
      ${order.customer_phone ? `<p>Tel: ${order.customer_phone}</p>` : ''}
      ${order.delivery_address ? `<p>Dir: ${order.delivery_address}</p>` : ''}
      <div class="divider"></div>
      ${order.order_items.map(item => `
        <div class="row"><span>${item.quantity}x ${item.product_name}</span><span>$${fmt(item.unit_price * item.quantity)}</span></div>
        ${item.order_item_extras.map(e => `<div style="padding-left:12px;color:#666">+ ${e.extra_name}</div>`).join('')}
      `).join('')}
      <div class="divider"></div>
      ${order.notes ? `<p>Nota: ${order.notes}</p><div class="divider"></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>$${fmt(order.total)}</span></div>
      ${order.payment_method && order.payment_method !== 'pending' ? `<p>Pago: ${order.payment_method}</p>` : ''}
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  // ── PIN screen ─────────────────────────────────────────────────────────────
  if (!unlocked) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔐</div>
          <h1 className="font-bold text-xl">{locationName}</h1>
          <p className="text-sm text-gray-400 mt-1">Panel de empleados</p>
        </div>
        <div className="flex flex-col gap-3">
          <input type="password" value={pin}
            onChange={e => { setPin(e.target.value); setPinError('') }}
            onKeyDown={e => e.key === 'Enter' && verifyPin()}
            placeholder="Ingresá el PIN" autoFocus
            className={`border rounded-xl px-4 py-3 text-center tracking-[0.5em] text-lg font-bold focus:outline-none focus:ring-2 focus:ring-black ${pinError ? 'border-red-300' : 'border-gray-200'}`} />
          {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
          <button onClick={verifyPin} disabled={verifying || !pin.trim()}
            className="bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-black">
            {verifying ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Datos del día ──────────────────────────────────────────────────────────
  const dayOrders = orders.filter(o => toLocalDate(o.created_at) === selectedDate)
  const delivered = dayOrders.filter(o => o.status === 'delivered')
  const cancelled = dayOrders.filter(o => o.status === 'cancelled')
  const totalRev  = delivered.reduce((s, o) => s + o.total, 0)
  const filtered  = dayOrders.filter(o => activeTab === 'all' || o.status === activeTab)
  const counts: Record<string, number> = {}
  STATUS_TABS.forEach(t => { counts[t.key] = t.key === 'all' ? dayOrders.length : dayOrders.filter(o => o.status === t.key).length })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">

      {/* Título */}
      <div className="mb-4">
        <h1 className="font-bold text-xl text-gray-900">{locationName}</h1>
        <p className="text-sm text-gray-400 mt-0.5">Panel de pedidos</p>
      </div>

      {/* Controles - estilo admin */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <LayoutList size={14} /> Lista
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <Columns3 size={14} /> Kanban
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSound} title={soundMuted ? 'Activar sonido' : 'Silenciar'}
            className={`p-2 rounded-xl border text-sm transition-colors ${
              soundMuted ? 'border-gray-200 text-gray-400 hover:bg-gray-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {soundMuted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
          <button onClick={() => setShowCreateOrder(true)}
            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 flex items-center gap-1.5">
            <Plus size={14} />
            Nuevo pedido
          </button>
        </div>
      </div>

      {/* Ventas del día */}
      {delivered.length > 0 && (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl flex items-center gap-5 overflow-x-auto mb-5">
          <div className="shrink-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recaudado</p>
            <p className="text-lg font-bold leading-tight">${fmt(totalRev)}</p>
          </div>
          <div className="w-px h-7 bg-gray-700 shrink-0" />
          <div className="flex gap-5 shrink-0">
            <div><p className="text-[10px] text-gray-500">Entregados</p><p className="font-semibold text-sm">{delivered.length}</p></div>
            {cancelled.length > 0 && <div><p className="text-[10px] text-gray-500">Cancelados</p><p className="font-semibold text-sm text-red-400">{cancelled.length}</p></div>}
            {[
              { k: 'cash', l: 'Efectivo' }, { k: 'card', l: 'Tarjeta' }, { k: 'transfer', l: 'Transfer.' }
            ].map(({ k, l }) => {
              const v = delivered.filter(o => o.payment_method === k).reduce((s, o) => s + o.total, 0)
              return v > 0 ? <div key={k}><p className="text-[10px] text-gray-500">{l}</p><p className="font-semibold text-sm">${fmt(v)}</p></div> : null
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando pedidos...</div>

      ) : viewMode === 'kanban' ? (

        /* ── KANBAN ─────────────────────────────────────────────────────── */
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          {KANBAN_COLS.map(col => {
            const colOrders = dayOrders.filter(o => o.status === col.key)
            return (
              <div key={col.key} className="shrink-0 w-72 flex flex-col gap-2">
                {/* Column header */}
                <div className={`${col.header} px-4 py-2.5 rounded-xl flex items-center justify-between`}>
                  <span className="text-white text-sm font-semibold">{col.label}</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{colOrders.length}</span>
                </div>

                {/* Cards */}
                {colOrders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-xs text-gray-300">
                    Sin pedidos
                  </div>
                ) : colOrders.map(order => {
                  const cfg = STATUS_CFG[order.status]
                  const pm  = order.payment_method && order.payment_method !== 'pending' ? PAYMENT_CONFIG[order.payment_method] : null
                  return (
                    <div key={order.id} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.border} p-3 shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{order.customer_name || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {TYPE_LABEL[order.order_type]}{order.table_number ? ` · ${order.table_number}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-gray-700">${fmt(order.total)}</span>
                          {pm && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${pm.bg} ${pm.text}`}>{pm.icon}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 mb-2.5">
                        {order.order_items.map(item => (
                          <div key={item.id}>
                            <span className="text-xs text-gray-500">{item.quantity}× {item.product_name}</span>
                            {item.order_item_extras.map(e => (
                              <p key={e.id} className="text-xs text-gray-400 pl-2 leading-tight">+ {e.extra_name}</p>
                            ))}
                          </div>
                        ))}
                      </div>

                      {order.notes && <p className="text-[11px] text-gray-400 italic mb-2">"{order.notes}"</p>}

                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-50 flex-wrap">
                        <span className="text-xs text-gray-300">{timeAgo(order.created_at)}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => setEditingOrder(order)}
                            title="Editar"
                            className="text-xs border border-gray-200 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 hover:text-gray-600">
                            ✏️
                          </button>
                          <button onClick={() => printOrder(order)}
                            title="Imprimir"
                            className="text-xs border border-gray-200 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 hover:text-gray-600">
                            🖨️
                          </button>
                          <button onClick={() => setChangingPaymentOrder(order)}
                            title="Cambiar pago"
                            className="text-xs border border-gray-200 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 hover:text-gray-600">
                            💳
                          </button>
                          {PREV_STATUS[order.status] && (
                            <button
                              onClick={() => updateStatus(order.id, PREV_STATUS[order.status])}
                              disabled={updating === order.id}
                              title={PREV_LABEL[order.status]}
                              className="text-xs border border-gray-200 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50">
                              ↩
                            </button>
                          )}
                          {NEXT_STATUS[order.status] && (
                            <button
                              onClick={() => handleNextStatus(order)}
                              disabled={updating === order.id}
                              className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium">
                              {updating === order.id ? '...' : NEXT_LABEL[order.status]}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

      ) : (

        /* ── LISTA ──────────────────────────────────────────────────────── */
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white border border-gray-100 p-1 rounded-xl overflow-x-auto shadow-sm">
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 text-xs py-2 px-2.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`ml-1 ${activeTab === tab.key ? 'text-gray-300' : 'text-gray-400'}`}>({counts[tab.key]})</span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-3xl mb-2">🍽️</p>
              <p className="text-sm text-gray-400">Sin pedidos en esta categoría</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(order => {
                const isExpanded = expandedId === order.id
                const cfg = STATUS_CFG[order.status]
                const pm  = order.payment_method && order.payment_method !== 'pending' ? PAYMENT_CONFIG[order.payment_method] : null

                return (
                  <div key={order.id}
                    className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.border} overflow-hidden shadow-sm`}>

                    {/* Card header — clickable */}
                    <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{order.customer_name || 'Sin nombre'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                            {TYPE_LABEL[order.order_type]}{order.table_number ? ` · ${order.table_number}` : ''}
                          </span>
                          {pm && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.bg} ${pm.text}`}>
                              {pm.icon} {pm.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                          <span className="text-gray-200 text-xs">·</span>
                          <span className="text-xs font-bold text-gray-700">${fmt(order.total)}</span>
                        </div>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {order.order_items.map(item => (
                            <div key={item.id}>
                              <span className="text-xs text-gray-500">{item.quantity}× {item.product_name}</span>
                              {item.order_item_extras.map(e => (
                                <p key={e.id} className="text-xs text-gray-400 pl-2 leading-tight">+ {e.extra_name}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick actions + chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        {PREV_STATUS[order.status] && (
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(order.id, PREV_STATUS[order.status]) }}
                            disabled={updating === order.id}
                            title={PREV_LABEL[order.status]}
                            className="text-xs border border-gray-200 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50">
                            ↩
                          </button>
                        )}
                        {NEXT_STATUS[order.status] && (
                          <button
                            onClick={e => { e.stopPropagation(); handleNextStatus(order) }}
                            disabled={updating === order.id}
                            className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium whitespace-nowrap">
                            {updating === order.id ? '...' : NEXT_LABEL[order.status]}
                          </button>
                        )}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" className="text-gray-300 transition-transform shrink-0"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                          <path d="M2 5l5 5 5-5" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-4">

                        {/* Items */}
                        <div className="flex flex-col gap-2 mb-4">
                          {order.order_items.map(item => (
                            <div key={item.id}>
                              <div className="flex items-start justify-between text-sm">
                                <span className="font-medium">{item.quantity}× {item.product_name}</span>
                                <span className="text-gray-600 ml-2 shrink-0">${fmt(item.unit_price * item.quantity)}</span>
                              </div>
                              {item.order_item_extras.map(e => (
                                <p key={e.id} className="text-xs text-gray-400 pl-3 mt-0.5">
                                  + {e.extra_name}{e.extra_price > 0 ? ` (+$${fmt(e.extra_price)})` : ''}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* Info extra */}
                        {(order.customer_phone || order.delivery_address || order.notes || order.cancel_reason) && (
                          <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-col gap-1.5 text-xs text-gray-500">
                            {order.customer_phone && (
                              <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank" className="text-green-600 hover:underline font-medium">
                                💬 {order.customer_phone}
                              </a>
                            )}
                            {order.delivery_address && <p>📍 {order.delivery_address}</p>}
                            {order.notes && <p className="italic">"{order.notes}"</p>}
                            {order.cancel_reason && <p className="text-red-500 font-medium">🚫 {order.cancel_reason}</p>}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => printOrder(order)}
                            className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                            🖨️ Imprimir
                          </button>
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button onClick={() => setEditingOrder(order)}
                              className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                              <PlusCircle size={12} /> Editar ítems
                            </button>
                          )}
                          <button onClick={() => setChangingPaymentOrder(order)}
                            className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                            💳 Cambiar pago
                          </button>
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button onClick={() => { setCancellingOrder(order); setCancelReason('') }}
                              className="text-xs border border-orange-200 text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50">
                              Cancelar pedido
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal editar ítems */}
      {editingOrder && (
        <AddItemsToOrderModal
          order={editingOrder}
          categories={categories}
          onClose={() => setEditingOrder(null)}
          onItemsAdded={handleItemsAdded}
        />
      )}

      {/* Modal crear pedido */}
      {showCreateOrder && (
        <CreateOrderModal
          locationId={locationId}
          categories={categories}
          onClose={() => setShowCreateOrder(false)}
          onCreated={handleOrderCreated}
        />
      )}

      {/* Modal pago en transición de estado */}
      {paymentModalOrder && (
        <PaymentMethodModal
          title={paymentModalTarget === 'preparing' ? '¿Cómo paga?' : '¿Cómo pagó?'}
          subtitle={`${paymentModalOrder.customer_name || 'Sin nombre'} · $${fmt(paymentModalOrder.total)}`}
          includePending={paymentModalTarget === 'preparing'}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setPaymentModalOrder(null)}
        />
      )}

      {/* Modal cambiar pago manual */}
      {changingPaymentOrder && (
        <PaymentMethodModal
          title="Cambiar medio de pago"
          subtitle={`${changingPaymentOrder.customer_name || 'Sin nombre'} · $${fmt(changingPaymentOrder.total)}`}
          includePending={true}
          onConfirm={handleChangePaymentConfirm}
          onCancel={() => setChangingPaymentOrder(null)}
        />
      )}

      {/* Modal cancelación */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6">
            <h3 className="font-bold text-base mb-1">Cancelar pedido</h3>
            <p className="text-sm text-gray-400 mb-4">{cancellingOrder.customer_name || 'Sin nombre'} · ${fmt(cancellingOrder.total)}</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)" rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setCancellingOrder(null); setCancelReason('') }}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Volver
              </button>
              <button onClick={confirmCancel} disabled={cancelling}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                {cancelling ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
