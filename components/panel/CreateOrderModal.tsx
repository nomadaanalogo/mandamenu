'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ArrowLeft, ArrowRight, ShoppingBag, Check } from 'lucide-react'
import {
  SimpleCategory, CartEntry, SelectedExtra,
  ProductBrowser, ExtrasStep,
  useExtrasState, addToCart, setCartEntryQty, cartTotal,
  buildProductsWithExtras,
} from '@/components/orders/AddItemsToOrderModal'
import { Plus, Minus } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface OrderItemExtra { id: string; extra_name: string; extra_price: number }
interface OrderItem {
  id: string; product_name: string; unit_price: number; quantity: number
  order_item_extras: OrderItemExtra[]
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

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })

const PAYMENT_OPTIONS = [
  { key: 'pending',  label: 'Por definir', icon: '⏳' },
  { key: 'cash',     label: 'Efectivo',    icon: '💵' },
  { key: 'card',     label: 'Tarjeta',     icon: '💳' },
  { key: 'transfer', label: 'Transferencia', icon: '📲' },
]

const ORDER_TYPES = [
  { key: 'table',    label: 'Mesa',       icon: '🪑' },
  { key: 'pickup',   label: 'Recoger',    icon: '🛍️' },
  { key: 'delivery', label: 'Domicilio',  icon: '🛵' },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function CreateOrderModal({
  locationId,
  categories,
  onClose,
  onCreated,
}: {
  locationId: string
  categories: SimpleCategory[]
  onClose: () => void
  onCreated: (order: Order) => void
}) {
  const supabase = createClient()

  const [step, setStep] = useState<'cart' | 'extras' | 'info'>('cart')
  const [cart, setCart] = useState<CartEntry[]>([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const extras = useExtrasState()

  // Info fields
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState<'table' | 'pickup' | 'delivery'>('table')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pending')
  const [saving, setSaving] = useState(false)

  const total = cartTotal(cart)

  // ── Cart handlers ──────────────────────────────────────────────────────
  function handleAddProduct(product: ReturnType<typeof buildProductsWithExtras>[number]) {
    if (product.allExtras.length > 0) {
      extras.openExtrasFor(product)
      setStep('extras')
    } else {
      setCart(prev => addToCart(prev, product, 1, []))
    }
  }

  function handleDecrementNoExtras(product: ReturnType<typeof buildProductsWithExtras>[number]) {
    setCart(prev => setCartEntryQty(prev, product.id, (prev.find(e => e.cartKey === product.id)?.quantity ?? 1) - 1))
  }

  function confirmExtras() {
    if (!extras.pendingProduct) return
    const selectedExtras: SelectedExtra[] = Object.values(extras.draftExtras).flat()
    setCart(prev => addToCart(prev, extras.pendingProduct!, extras.draftQty, selectedExtras))
    extras.setPendingProduct(null)
    setStep('cart')
  }

  // ── Confirm order ──────────────────────────────────────────────────────
  async function handleConfirm() {
    if (cart.length === 0) return
    setSaving(true)

    const { data: newOrder } = await supabase
      .from('orders')
      .insert({
        location_id: locationId,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        order_type: orderType,
        table_number: orderType === 'table' && tableNumber.trim() ? tableNumber.trim() : null,
        delivery_address: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : null,
        notes: notes.trim() || null,
        status: 'pending',
        payment_method: paymentMethod,
        total,
      })
      .select()
      .single()

    if (!newOrder) { setSaving(false); return }

    const { data: insertedItems } = await supabase
      .from('order_items')
      .insert(cart.map(entry => ({
        order_id: newOrder.id,
        product_id: entry.product.id,
        product_name: entry.product.name,
        unit_price: entry.product.price,
        quantity: entry.quantity,
      })))
      .select('id')

    if (insertedItems) {
      const extrasToInsert = insertedItems.flatMap((inserted, idx) =>
        (cart[idx]?.extras ?? []).map(e => ({
          order_item_id: inserted.id,
          extra_name: e.option.name,
          extra_price: e.option.price_add,
        }))
      )
      if (extrasToInsert.length > 0) {
        await supabase.from('order_item_extras').insert(extrasToInsert)
      }
    }

    const { data: fullOrder } = await supabase
      .from('orders').select('*, order_items(*, order_item_extras(*))').eq('id', newOrder.id).single()

    onCreated(fullOrder as Order)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            {step === 'extras' && extras.pendingProduct ? (
              <>
                <h3 className="font-bold text-base">{extras.pendingProduct.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">${fmt(extras.pendingProduct.price)} · Elegí opciones</p>
              </>
            ) : step === 'info' ? (
              <>
                <h3 className="font-bold text-base">Datos del pedido</h3>
                <p className="text-xs text-gray-400 mt-0.5">{cart.length} ítem{cart.length !== 1 ? 's' : ''} · ${fmt(total)}</p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base">Nuevo pedido</h3>
                <p className="text-xs text-gray-400 mt-0.5">Seleccioná los productos</p>
              </>
            )}
          </div>
          <button
            onClick={step === 'extras' ? () => setStep('cart') : step === 'info' ? () => setStep('cart') : onClose}
            className="text-gray-400 hover:text-gray-600 p-1">
            {step === 'cart' ? <X size={18} /> : <ArrowLeft size={18} />}
          </button>
        </div>

        {/* ── extras step ─────────────────────────────────────── */}
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

        {/* ── cart step ───────────────────────────────────────── */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Cart summary */}
              {cart.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">En el pedido</p>
                  <div className="flex flex-col gap-1 mb-1">
                    {cart.map(entry => (
                      <div key={entry.cartKey}
                        className="flex items-center justify-between gap-3 py-2 border-b border-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.product.name}</p>
                          {entry.extras.length > 0 && (
                            <p className="text-xs text-gray-400">{entry.extras.map(e => e.option.name).join(', ')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setCart(prev => setCartEntryQty(prev, entry.cartKey, entry.quantity - 1))}
                            className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500">
                            <Minus size={11} />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{entry.quantity}</span>
                          <button
                            onClick={() => setCart(prev => setCartEntryQty(prev, entry.cartKey, entry.quantity + 1))}
                            className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {cart.length > 0 ? 'Agregar más' : 'Productos'}
              </p>
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
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
              {cart.length > 0 && (
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <ShoppingBag size={14} />
                  Total: <span className="font-bold text-gray-900">${fmt(total)}</span>
                </div>
              )}
              <button
                onClick={() => setStep('info')}
                disabled={cart.length === 0}
                className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2">
                Siguiente
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {/* ── info step ───────────────────────────────────────── */}
        {step === 'info' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Order type */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tipo de pedido</p>
                <div className="grid grid-cols-3 gap-2">
                  {ORDER_TYPES.map(t => (
                    <button key={t.key} onClick={() => setOrderType(t.key as typeof orderType)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm transition-colors ${
                        orderType === t.key
                          ? 'border-gray-900 bg-gray-50 font-medium'
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}>
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table number */}
              {orderType === 'table' && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Número de mesa
                  </label>
                  <input value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                    placeholder="Ej: Mesa 5 / Salón A"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              )}

              {/* Delivery address */}
              {orderType === 'delivery' && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Dirección de entrega
                  </label>
                  <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Calle, número, piso... *"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black ${!deliveryAddress.trim() ? 'border-red-200' : 'border-gray-200'}`} />
                </div>
              )}

              {/* Customer name */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Nombre del cliente
                </label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nombre *"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black ${!customerName.trim() ? 'border-red-200' : 'border-gray-200'}`} />
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Teléfono <span className="font-normal text-gray-300">(opcional)</span>
                </label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp, celular..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Notas <span className="font-normal text-gray-300">(opcional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Sin cebolla, extra salsa..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
              </div>

              {/* Payment method */}
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Medio de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map(p => (
                    <button key={p.key} onClick={() => setPaymentMethod(p.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        paymentMethod === p.key
                          ? 'border-gray-900 bg-gray-50 font-medium'
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}>
                      <span>{p.icon}</span>
                      <span className="text-sm">{p.label}</span>
                      {paymentMethod === p.key && <Check size={13} className="ml-auto text-gray-700" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                <ShoppingBag size={14} />
                Total del pedido: <span className="font-bold text-gray-900">${fmt(total)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('cart')}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Volver
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving || !customerName.trim() || (orderType === 'delivery' && !deliveryAddress.trim())}
                  className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40">
                  {saving ? 'Creando...' : 'Confirmar pedido'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
