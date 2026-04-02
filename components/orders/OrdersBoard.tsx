'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal'
import AddItemsToOrderModal, {
  CartEntry, ProductWithExtras, useExtrasState, addToCart, setCartEntryQty, cartTotal,
  ProductBrowser, ExtrasStep,
} from '@/components/orders/AddItemsToOrderModal'
import PaymentMethodModal, { PAYMENT_CONFIG } from '@/components/ui/PaymentMethodModal'
import { LayoutList, Columns3, PlusCircle, MoreHorizontal, Bell, BellOff } from 'lucide-react'

// ── interfaces ────────────────────────────────────────────────────────────────
interface OrderItemExtra {
  id: string
  extra_name: string
  extra_price: number
}

interface OrderItem {
  id: string
  product_name: string
  unit_price: number
  quantity: number
  order_item_extras: OrderItemExtra[]
}

interface Order {
  id: string
  location_id: string
  customer_name: string | null
  customer_phone: string | null
  order_type: 'table' | 'pickup' | 'delivery'
  table_number: string | null
  delivery_address: string | null
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  total: number
  notes: string | null
  cancel_reason: string | null
  payment_method: string | null
  created_at: string
  order_items: OrderItem[]
}

interface Location {
  id: string
  name: string
}

interface SimpleProduct {
  id: string
  name: string
  price: number
  description: string | null
  is_available: boolean
}

interface SimpleCategory {
  id: string
  name: string
  products: SimpleProduct[]
}

// ── constants ─────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready',     label: 'Listos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]

const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  pending:   { label: 'Pendiente',  badge: 'bg-amber-50 text-amber-600',  border: 'border-l-amber-400' },
  preparing: { label: 'Preparando', badge: 'bg-blue-50 text-blue-600',    border: 'border-l-blue-400' },
  ready:     { label: 'Listo',      badge: 'bg-green-50 text-green-600',  border: 'border-l-green-400' },
  delivered: { label: 'Entregado',  badge: 'bg-gray-50 text-gray-400',    border: 'border-l-gray-200' },
  cancelled: { label: 'Cancelado',  badge: 'bg-red-50 text-red-500',      border: 'border-l-red-300' },
}

const NEXT_STATUS: Record<string, string> = {
  pending: 'preparing', preparing: 'ready', ready: 'delivered',
}

const NEXT_LABEL: Record<string, string> = {
  pending: 'Preparar', preparing: 'Marcar listo', ready: 'Entregar',
}

const PREV_STATUS: Record<string, string> = {
  preparing: 'pending', ready: 'preparing',
}

const PREV_LABEL: Record<string, string> = {
  preparing: 'Volver a pendiente', ready: 'Volver a preparando',
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  table: '🪑 Mesa', pickup: '🛍️ Recoger', delivery: '🛵 Domicilio',
}

// ── utils ─────────────────────────────────────────────────────────────────────
function toLocalDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-CA')
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0 })
}

// ── main component ────────────────────────────────────────────────────────────
export default function OrdersBoard({
  initialOrders, restaurantId, locationIds, locations, categories,
}: {
  initialOrders: Order[]
  restaurantId: string
  locationIds: string[]
  locations: Location[]
  categories: SimpleCategory[]
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [activeTab, setActiveTab] = useState('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)
  const [soundMuted, setSoundMuted] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('orders-sound-muted') === 'true' : false
  )
  const soundMutedRef = useRef(soundMuted)
  const [orderToast, setOrderToast] = useState<Order | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showOrderToast(order: Order) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setOrderToast(order)
    toastTimerRef.current = setTimeout(() => setOrderToast(null), 6000)
  }

  function toggleSound() {
    const next = !soundMuted
    setSoundMuted(next)
    soundMutedRef.current = next
    localStorage.setItem('orders-sound-muted', String(next))
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const notes = [523.25, 659.25, 783.99] // C5 – E5 – G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65)
        osc.start(t)
        osc.stop(t + 0.65)
      })
    } catch {
      // browser may block AudioContext before a user gesture — silently ignore
    }
  }

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('orders-view') as 'list' | 'kanban' | null
    if (saved) setViewMode(saved)
  }, [])

  function switchView(mode: 'list' | 'kanban') {
    setViewMode(mode)
    localStorage.setItem('orders-view', mode)
  }

  async function fetchOrdersForDate(date: string) {
    setLoadingDate(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, order_item_extras(*))')
      .in('location_id', locationIds.length ? locationIds : [''])
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59.999`)
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoadingDate(false)
  }

  function handleDateChange(date: string) {
    setSelectedDate(date)
    fetchOrdersForDate(date)
  }

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          if (!locationIds.includes(payload.new.location_id)) return
          const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, order_item_extras(*))')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setOrders((prev) => prev.some((o) => o.id === data.id) ? prev : [data, ...prev])
            setActiveTab('pending')
            if (!soundMutedRef.current) playNotificationSound()
            showOrderToast(data)
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (!locationIds.includes(payload.new.location_id)) return
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationIds.join(',')])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId)
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(orders.map((o) => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
    setUpdating(null)
  }

  async function confirmCancel() {
    if (!cancellingOrder) return
    setCancelling(true)
    await supabase.from('orders')
      .update({ status: 'cancelled', cancel_reason: cancelReason.trim() || null })
      .eq('id', cancellingOrder.id)
    setOrders(orders.map((o) =>
      o.id === cancellingOrder.id
        ? { ...o, status: 'cancelled', cancel_reason: cancelReason.trim() || null }
        : o
    ))
    setCancellingOrder(null)
    setCancelReason('')
    setCancelling(false)
  }

  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // ── agregar ítems ────────────────────────────────────────────────────────
  const [addingItemsOrder, setAddingItemsOrder] = useState<Order | null>(null)

  // ── confirm deliver modals (por tipo de pedido) ──────────────────────────
  const [deliverConfirmOrder, setDeliverConfirmOrder] = useState<Order | null>(null)
  const [deliveringOrder, setDeliveringOrder] = useState(false)
  const [deliverPayment, setDeliverPayment] = useState<string | null>(null)

  // ── modal medio de pago al preparar ──────────────────────────────────────
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null)

  function handleDeliverClick(order: Order) {
    setDeliverPayment(null)
    setDeliverConfirmOrder(order)
  }

  async function confirmDeliver() {
    if (!deliverConfirmOrder) return
    const needsPayment = !deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending'
    if (needsPayment && !deliverPayment) return
    setDeliveringOrder(true)
    const updates: Record<string, string> = { status: 'delivered' }
    if (needsPayment && deliverPayment) updates.payment_method = deliverPayment
    await supabase.from('orders').update(updates).eq('id', deliverConfirmOrder.id)
    setOrders(orders.map(o => o.id === deliverConfirmOrder.id ? { ...o, ...updates } : o))
    setDeliverConfirmOrder(null)
    setDeliverPayment(null)
    setDeliveringOrder(false)
  }

  async function handlePaymentAndPrepare(method: string) {
    if (!paymentModalOrder) return
    setUpdating(paymentModalOrder.id)
    await supabase.from('orders').update({ status: 'preparing', payment_method: method }).eq('id', paymentModalOrder.id)
    setOrders(orders.map(o => o.id === paymentModalOrder!.id ? { ...o, status: 'preparing', payment_method: method } : o))
    setPaymentModalOrder(null)
    setUpdating(null)
  }

  async function deleteOrder(orderId: string) {
    setDeletingOrderId(orderId)
  }

  async function confirmDeleteOrder() {
    if (!deletingOrderId) return
    setConfirmingDelete(true)
    await supabase.from('orders').delete().eq('id', deletingOrderId)
    setOrders((prev) => prev.filter((o) => o.id !== deletingOrderId))
    setDeletingOrderId(null)
    setConfirmingDelete(false)
  }

  function printOrder(order: Order) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Pedido #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        body { font-family: monospace; font-size: 14px; padding: 20px; max-width: 300px; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .total { font-weight: bold; font-size: 16px; }
      </style></head><body>
      <h2>Pedido #${order.id.slice(0, 8).toUpperCase()}</h2>
      <p>${new Date(order.created_at).toLocaleString()}</p>
      <p>${ORDER_TYPE_LABEL[order.order_type]}${order.table_number ? ` ${order.table_number}` : ''}</p>
      ${order.customer_name ? `<p>Cliente: ${order.customer_name}</p>` : ''}
      ${order.customer_phone ? `<p>Tel: ${order.customer_phone}</p>` : ''}
      ${order.delivery_address ? `<p>Dir: ${order.delivery_address}</p>` : ''}
      <div class="divider"></div>
      ${order.order_items.map((item) => `
        <div class="row"><span>${item.quantity}x ${item.product_name}</span><span>$${fmt(item.unit_price * item.quantity)}</span></div>
        ${item.order_item_extras.map((e) => `<div style="padding-left:12px;color:#666">+ ${e.extra_name}</div>`).join('')}
      `).join('')}
      <div class="divider"></div>
      ${order.notes ? `<p>Nota: ${order.notes}</p><div class="divider"></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>$${fmt(order.total)}</span></div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const dayOrders = orders.filter((o) =>
    toLocalDate(o.created_at) === selectedDate &&
    (selectedLocation === 'all' || o.location_id === selectedLocation)
  )

  const filtered = dayOrders.filter((o) => activeTab === 'all' || o.status === activeTab)

  const counts: Record<string, number> = {}
  STATUS_TABS.forEach((t) => {
    counts[t.key] = t.key === 'all' ? dayOrders.length : dayOrders.filter((o) => o.status === t.key).length
  })

  return (
    <div>
      {/* ── top bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
          {locations.length > 1 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="all">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {/* Toggle vista */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => switchView('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <LayoutList size={14} /> Lista
            </button>
            <button onClick={() => switchView('kanban')}
              className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <Columns3 size={14} /> Kanban
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            title={soundMuted ? 'Activar sonido' : 'Silenciar'}
            className={`p-2 rounded-xl border text-sm transition-colors ${
              soundMuted
                ? 'border-gray-200 text-gray-400 hover:bg-gray-50'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {soundMuted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
          <button
            onClick={() => setShowNewOrder(true)}
            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 flex items-center gap-1.5">
            <span className="text-base leading-none">+</span>
            <span>Nuevo pedido</span>
          </button>
        </div>
      </div>

      {/* ── kanban view ─────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-4">
          {(['pending', 'preparing', 'ready'] as const).map((status) => {
            const cfg = STATUS_CONFIG[status]
            const colOrders = dayOrders.filter((o) => o.status === status)
            return (
              <div key={status} className="flex flex-col gap-2">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${cfg.badge}`}>
                  <span className="text-xs font-bold uppercase tracking-wide">{cfg.label}</span>
                  <span className="text-xs font-bold opacity-70">{colOrders.length}</span>
                </div>
                {/* Cards */}
                {colOrders.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl">
                    Sin pedidos
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div key={order.id} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.border} p-3 shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{order.customer_name || 'Sin nombre'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ORDER_TYPE_LABEL[order.order_type]}
                            {order.table_number ? ` · ${order.table_number}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-gray-700">${fmt(order.total)}</span>
                          <button
                            onClick={() => setAddingItemsOrder(order)}
                            className="text-gray-300 hover:text-gray-600 transition-colors p-0.5">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 mb-2.5">
                        {order.order_items.map((item) => (
                          <div key={item.id}>
                            <span className="text-xs text-gray-500">{item.quantity}× {item.product_name}</span>
                            {item.order_item_extras.map((extra) => (
                              <p key={extra.id} className="text-xs text-gray-400 pl-2 leading-tight">+ {extra.extra_name}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-gray-300">{timeAgo(order.created_at)}</span>
                        <div className="flex items-center gap-1">
                          {PREV_STATUS[status] && (
                            <button
                              onClick={() => updateStatus(order.id, PREV_STATUS[status])}
                              disabled={updating === order.id}
                              title={PREV_LABEL[status]}
                              className="text-xs border border-gray-200 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50">
                              ↩
                            </button>
                          )}
                          {NEXT_STATUS[status] && (
                            <button
                              onClick={() => {
                                if (status === 'ready') handleDeliverClick(order)
                                else if (status === 'pending') setPaymentModalOrder(order)
                                else updateStatus(order.id, NEXT_STATUS[status])
                              }}
                              disabled={updating === order.id}
                              className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium">
                              {updating === order.id ? '...' : NEXT_LABEL[status]}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── list view ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {/* tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-5 pb-0.5">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}>
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`ml-1 ${activeTab === tab.key ? 'text-white/60' : 'text-gray-400'}`}>
                    ({counts[tab.key]})
                  </span>
                )}
              </button>
            ))}
          </div>
      {/* orders */}
      {loadingDate ? (
        <div className="text-center py-20 text-sm text-gray-400">Cargando pedidos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">🍽️</p>
          <p className="text-sm text-gray-400">Sin pedidos aquí</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((order) => {
            const isExpanded = expandedId === order.id
            const cfg = STATUS_CONFIG[order.status]

            return (
              <div key={order.id}
                className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.border} overflow-hidden shadow-sm`}>

                {/* Card header — clickable */}
                <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {order.customer_name || 'Sin nombre'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {ORDER_TYPE_LABEL[order.order_type]}
                        {order.table_number ? ` · ${order.table_number}` : ''}
                      </span>
                      {order.payment_method && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_CONFIG[order.payment_method]?.bg} ${PAYMENT_CONFIG[order.payment_method]?.text}`}>
                          {PAYMENT_CONFIG[order.payment_method]?.icon} {PAYMENT_CONFIG[order.payment_method]?.label}
                        </span>
                      )}
                      {locations.length > 1 && selectedLocation === 'all' && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          {locations.find((l) => l.id === order.location_id)?.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                      <span className="text-gray-200 text-xs">·</span>
                      <span className="text-xs font-bold text-gray-700">${fmt(order.total)}</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {order.order_items.map((item) => (
                        <div key={item.id}>
                          <span className="text-xs text-gray-500">{item.quantity}× {item.product_name}</span>
                          {item.order_item_extras.map((extra) => (
                            <p key={extra.id} className="text-xs text-gray-400 pl-2 leading-tight">+ {extra.extra_name}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick action + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {PREV_STATUS[order.status] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(order.id, PREV_STATUS[order.status]) }}
                        disabled={updating === order.id}
                        title={PREV_LABEL[order.status]}
                        className="text-xs border border-gray-200 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50 whitespace-nowrap">
                        ↩
                      </button>
                    )}
                    {NEXT_STATUS[order.status] && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (order.status === 'ready') handleDeliverClick(order)
                          else if (order.status === 'pending') setPaymentModalOrder(order)
                          else updateStatus(order.id, NEXT_STATUS[order.status])
                        }}
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

                    {/* Products */}
                    <div className="flex flex-col gap-2 mb-4">
                      {order.order_items.map((item) => (
                        <div key={item.id}>
                          <div className="flex items-start justify-between text-sm">
                            <span className="font-medium">{item.quantity}× {item.product_name}</span>
                            <span className="text-gray-600 ml-2 shrink-0">${fmt(item.unit_price * item.quantity)}</span>
                          </div>
                          {item.order_item_extras.map((extra) => (
                            <p key={extra.id} className="text-xs text-gray-400 pl-3 mt-0.5">
                              + {extra.extra_name}{extra.extra_price > 0 ? ` (+$${fmt(extra.extra_price)})` : ''}
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
                        {order.notes && <p className="italic">&ldquo;{order.notes}&rdquo;</p>}
                        {order.cancel_reason && (
                          <p className="text-red-500 font-medium">🚫 {order.cancel_reason}</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => printOrder(order)}
                        className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                        🖨️ Imprimir
                      </button>
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <>
                          <button
                            onClick={() => setAddingItemsOrder(order)}
                            className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                            <PlusCircle size={12} /> Agregar ítems
                          </button>
                          <button
                            onClick={() => { setCancellingOrder(order); setCancelReason('') }}
                            className="text-xs border border-orange-200 text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50">
                            Cancelar pedido
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteOrder(order.id)}
                        className="text-xs border border-red-200 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50">
                        Eliminar
                      </button>
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

      {/* ── new order modal ──────────────────────────────────────────── */}
      {showNewOrder && (
        <NewOrderModal
          locations={locations}
          categories={categories}
          defaultLocationId={selectedLocation !== 'all' ? selectedLocation : locations[0]?.id}
          onClose={() => setShowNewOrder(false)}
          onCreated={(newOrder) => {
            const order = newOrder as Order
            setOrders((prev) => prev.some((o) => o.id === order.id) ? prev : [order, ...prev])
            setShowNewOrder(false)
            setActiveTab('pending')
          }}
        />
      )}

      {/* ── cancel modal ─────────────────────────────────────────────── */}
      {deletingOrderId && (
        <ConfirmModal
          title="¿Eliminar este pedido?"
          description="Esta acción no se puede deshacer."
          loading={confirmingDelete}
          onConfirm={confirmDeleteOrder}
          onCancel={() => setDeletingOrderId(null)}
        />
      )}

      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-base mb-1">Cancelar pedido</h3>
            <p className="text-sm text-gray-400 mb-4">
              {cancellingOrder.customer_name || 'Sin nombre'} · ${fmt(cancellingOrder.total)}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCancellingOrder(null); setCancelReason('') }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                Volver
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                {cancelling ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── agregar ítems modal ───────────────────────────────────────── */}
      {addingItemsOrder && (
        <AddItemsToOrderModal
          order={addingItemsOrder}
          categories={categories}
          onClose={() => setAddingItemsOrder(null)}
          onItemsAdded={async (updatedOrder, newStatus) => {
            setOrders((prev) => prev.map((o) => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            if (newStatus) await updateStatus(updatedOrder.id, newStatus)
            setAddingItemsOrder(null)
          }}
        />
      )}

      {/* ── confirm deliver modal ─────────────────────────────────────── */}
      {deliverConfirmOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">

            {/* Mesa */}
            {deliverConfirmOrder.order_type === 'table' && (
              <>
                <p className="text-2xl mb-3">🪑</p>
                <h3 className="font-bold text-base mb-1">¿El cliente ya se fue?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Si cerrás el pedido ya no podrás agregar más ítems.
                </p>
                {(!deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending') && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">¿Cómo pagó?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['cash','card','transfer'].map(key => {
                        const cfg = PAYMENT_CONFIG[key]
                        return (
                          <button key={key} onClick={() => setDeliverPayment(key)}
                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${deliverPayment === key ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-gray-200 text-gray-400'}`}>
                            <span className="text-lg">{cfg.icon}</span>{cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setDeliverConfirmOrder(null)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Todavía no
                  </button>
                  <button onClick={confirmDeliver} disabled={deliveringOrder || ((!deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending') && !deliverPayment)}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {deliveringOrder ? '...' : 'Sí, cerrar pedido'}
                  </button>
                </div>
              </>
            )}

            {/* Delivery */}
            {deliverConfirmOrder.order_type === 'delivery' && (
              <>
                <p className="text-2xl mb-3">🛵</p>
                <h3 className="font-bold text-base mb-1">Verificá antes de enviar</h3>
                <p className="text-sm text-gray-500 mb-1">
                  {deliverConfirmOrder.customer_name || 'Sin nombre'}
                  {deliverConfirmOrder.customer_phone ? ` · ${deliverConfirmOrder.customer_phone}` : ''}
                </p>
                {deliverConfirmOrder.delivery_address && (
                  <p className="text-xs text-gray-400 mb-3">📍 {deliverConfirmOrder.delivery_address}</p>
                )}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-col gap-1 text-sm">
                  {deliverConfirmOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-gray-700">{item.quantity}× {item.product_name}</span>
                      <span className="text-gray-500">${fmt(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-sm">
                    <span>Total</span><span>${fmt(deliverConfirmOrder.total)}</span>
                  </div>
                </div>
                {(!deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending') && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">¿Cómo pagó?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['cash','card','transfer'].map(key => {
                        const cfg = PAYMENT_CONFIG[key]
                        return (
                          <button key={key} onClick={() => setDeliverPayment(key)}
                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${deliverPayment === key ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-gray-200 text-gray-400'}`}>
                            <span className="text-lg">{cfg.icon}</span>{cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setDeliverConfirmOrder(null)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Volver
                  </button>
                  <button onClick={confirmDeliver} disabled={deliveringOrder || ((!deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending') && !deliverPayment)}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {deliveringOrder ? '...' : 'Confirmar envío'}
                  </button>
                </div>
              </>
            )}

            {/* Pickup */}
            {deliverConfirmOrder.order_type === 'pickup' && (
              <>
                <p className="text-2xl mb-3">🛍️</p>
                <h3 className="font-bold text-base mb-1">¿El cliente retiró su pedido?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {deliverConfirmOrder.customer_name || 'Sin nombre'} · ${fmt(deliverConfirmOrder.total)}
                </p>
                {(!deliverConfirmOrder.payment_method || deliverConfirmOrder.payment_method === 'pending') && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">¿Cómo pagó?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['cash','card','transfer'].map(key => {
                        const cfg = PAYMENT_CONFIG[key]
                        return (
                          <button key={key} onClick={() => setDeliverPayment(key)}
                            className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${deliverPayment === key ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-gray-200 text-gray-400'}`}>
                            <span className="text-lg">{cfg.icon}</span>{cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeliverConfirmOrder(null)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeliver}
                    disabled={deliveringOrder}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    {deliveringOrder ? '...' : 'Confirmar retiro'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── modal medio de pago al preparar ───────────────────────────── */}
      {paymentModalOrder && (
        <PaymentMethodModal
          title="¿Cómo paga?"
          subtitle={`${paymentModalOrder.customer_name || 'Sin nombre'} · $${fmt(paymentModalOrder.total)}`}
          includePending={true}
          onConfirm={handlePaymentAndPrepare}
          onCancel={() => setPaymentModalOrder(null)}
        />
      )}

      {/* ── toast nuevo pedido ────────────────────────────────────────── */}
      {orderToast && (
        <div className="fixed bottom-6 right-6 z-60 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-start gap-3 max-w-xs w-full">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-base mt-0.5">
              🛎️
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Nuevo pedido</p>
              <p className="text-xs text-gray-300 mt-0.5 truncate">
                {orderToast.customer_name || 'Sin nombre'}
                {orderToast.order_type === 'table' && orderToast.table_number
                  ? ` · Mesa ${orderToast.table_number}`
                  : orderToast.order_type === 'pickup' ? ' · Retiro' : orderToast.order_type === 'delivery' ? ' · Delivery' : ''}
              </p>
              <p className="text-xs font-semibold text-white/80 mt-1">${fmt(orderToast.total)}</p>
            </div>
            <button
              onClick={() => setOrderToast(null)}
              className="text-gray-400 hover:text-white mt-0.5 shrink-0">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── NEW ORDER MODAL ───────────────────────────────────────────────────────────

function NewOrderModal({
  locations, categories, defaultLocationId, onClose, onCreated,
}: {
  locations: Location[]
  categories: SimpleCategory[]
  defaultLocationId?: string
  onClose: () => void
  onCreated: (order: unknown) => void
}) {
  const supabase = createClient()
  const [step, setStep] = useState<'cart' | 'extras' | 'info'>('cart')
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [cart, setCart] = useState<CartEntry[]>([])
  const extras = useExtrasState()

  const [orderType, setOrderType] = useState<'table' | 'pickup' | 'delivery'>('table')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [locationId, setLocationId] = useState(defaultLocationId || locations[0]?.id || '')
  const [sending, setSending] = useState(false)

  const total = cartTotal(cart)
  const totalItems = cart.reduce((s, e) => s + e.quantity, 0)

  function handleAddProduct(product: ProductWithExtras) {
    if (product.allExtras.length > 0) {
      extras.openExtrasFor(product)
      setStep('extras')
    } else {
      setCart(prev => addToCart(prev, product, 1, []))
    }
  }

  function handleDecrementNoExtras(product: ProductWithExtras) {
    setCart(prev => setCartEntryQty(prev, product.id, (prev.find(e => e.cartKey === product.id)?.quantity ?? 1) - 1))
  }

  function confirmExtras() {
    if (!extras.pendingProduct) return
    const selectedExtras = Object.values(extras.draftExtras).flat()
    setCart(prev => addToCart(prev, extras.pendingProduct!, extras.draftQty, selectedExtras))
    extras.setPendingProduct(null)
    setStep('cart')
  }

  async function submit() {
    if (!locationId) { alert('Seleccioná una sede'); return }
    setSending(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          order_type: orderType,
          table_number: tableNumber || null,
          delivery_address: deliveryAddress || null,
          notes: notes || null,
          items: cart.map((entry) => ({
            product_id: entry.product.id,
            name: entry.product.name,
            price: entry.product.price,
            quantity: entry.quantity,
            extras: entry.extras.map(e => ({ id: e.option.id, name: e.option.name, price: e.option.price_add })),
          })),
        }),
      })
      const data = await res.json()
      const { data: newOrder } = await supabase
        .from('orders')
        .select('*, order_items(*, order_item_extras(*))')
        .eq('id', data.order_id)
        .single()
      if (newOrder) onCreated(newOrder)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl max-h-[95vh] flex flex-col w-full">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {(step === 'info' || step === 'extras') && (
              <button onClick={() => setStep(step === 'extras' ? 'cart' : 'cart')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 2L4 7l5 5" />
                </svg>
                Volver
              </button>
            )}
            <h2 className="font-bold text-lg">
              {step === 'cart' ? 'Nuevo pedido' : step === 'extras' && extras.pendingProduct ? extras.pendingProduct.name : 'Datos del pedido'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm hover:bg-gray-200">
            ✕
          </button>
        </div>

        {/* ── extras step ─────────────────────────────────── */}
        {step === 'extras' && extras.pendingProduct && (
          <ExtrasStep
            product={extras.pendingProduct}
            draftQty={extras.draftQty}
            setDraftQty={extras.setDraftQty}
            draftExtras={extras.draftExtras}
            toggleExtra={extras.toggleExtra}
            extrasValid={extras.extrasValid}
            onConfirm={confirmExtras}
            onBack={() => setStep('cart')}
          />
        )}

        {/* ── cart step ───────────────────────────────────── */}
        {step === 'cart' && (
          <>
            {/* Cart summary (if has items) */}
            {cart.length > 0 && (
              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                  {cart.map(entry => (
                    <div key={entry.cartKey} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">
                        {entry.quantity}× {entry.product.name}
                        {entry.extras.length > 0 && <span className="text-gray-400 text-xs"> ({entry.extras.map(e => e.option.name).join(', ')})</span>}
                      </span>
                      <span className="font-medium shrink-0">
                        ${fmt((entry.product.price + entry.extras.reduce((s, e) => s + e.option.price_add, 0)) * entry.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product browser */}
            <div className="overflow-y-auto flex-1 px-5 pt-3">
              <ProductBrowser
                categories={categories}
                cart={cart}
                search={search} setSearch={setSearch}
                activeCat={activeCat} setActiveCat={setActiveCat}
                onAdd={handleAddProduct}
                onDecrement={handleDecrementNoExtras}
              />
            </div>

            {/* Footer */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setStep('info')}
                disabled={cart.length === 0}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 flex items-center justify-between px-5 hover:bg-gray-800 transition-colors">
                <span className="bg-white/20 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
                <span>Continuar</span>
                <span>${fmt(total)}</span>
              </button>
            </div>
          </>
        )}

        {/* ── info step ───────────────────────────────────── */}
        {step === 'info' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 pt-4">

              {/* Cart summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2.5">Resumen</p>
                <div className="flex flex-col gap-1.5">
                  {cart.map((entry) => (
                    <div key={entry.cartKey} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{entry.quantity}× {entry.product.name}</span>
                        <span className="font-semibold text-gray-900">
                          ${fmt((entry.product.price + entry.extras.reduce((s, e) => s + e.option.price_add, 0)) * entry.quantity)}
                        </span>
                      </div>
                      {entry.extras.length > 0 && (
                        <p className="text-xs text-gray-400 pl-3">+ {entry.extras.map(e => e.option.name).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>${fmt(total)}</span>
                </div>
              </div>

              {/* Order type */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">¿Cómo es el pedido?</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { key: 'table', label: 'Mesa', icon: '🪑' },
                  { key: 'pickup', label: 'Recoger', icon: '🛍️' },
                  { key: 'delivery', label: 'Domicilio', icon: '🛵' },
                ].map((opt) => (
                  <button key={opt.key}
                    onClick={() => setOrderType(opt.key as 'table' | 'pickup' | 'delivery')}
                    className={`flex flex-col items-center py-3 rounded-xl border text-xs font-semibold transition-all ${
                      orderType === opt.key
                        ? 'bg-black border-black text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <span className="text-xl mb-1">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-2.5">
                {orderType === 'table' && (
                  <input type="text" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Número de mesa (opcional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                )}
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente *"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 ${!customerName.trim() ? 'border-red-200' : 'border-gray-200'}`} />
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                {orderType === 'delivery' && (
                  <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Dirección de entrega *"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 ${!deliveryAddress.trim() ? 'border-red-200' : 'border-gray-200'}`} />
                )}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas del pedido (opcional)" rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 resize-none" />
                {locations.length > 1 && (
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50">
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="h-4" />
            </div>

            {/* Submit */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100 shrink-0">
              <button
                onClick={submit}
                disabled={sending || !customerName.trim() || (orderType === 'delivery' && !deliveryAddress.trim())}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors">
                {sending ? 'Creando pedido...' : `Crear pedido · $${fmt(total)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
