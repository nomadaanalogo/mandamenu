'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Minus, ShoppingBag, Pencil, ChefHat, Zap, ArrowLeft, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
export interface ExtraOption { id: string; name: string; price_add: number }
export interface ExtraGroup {
  id: string; name: string; is_required: boolean; is_multiple: boolean
  extra_options: ExtraOption[]
}
export interface SimpleProduct {
  id: string; name: string; price: number; description: string | null; is_available: boolean
  product_extra_groups?: { extra_groups: ExtraGroup }[]
}
export interface SimpleCategory {
  id: string; name: string
  category_extra_groups?: { extra_groups: ExtraGroup }[]
  products: SimpleProduct[]
}

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

export interface ProductWithExtras extends SimpleProduct { allExtras: ExtraGroup[] }
export interface SelectedExtra { groupId: string; option: ExtraOption }
export interface CartEntry {
  cartKey: string; product: ProductWithExtras; quantity: number; extras: SelectedExtra[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('es-CO', { minimumFractionDigits: 0 }) }
const ORDER_TYPE_LABEL: Record<string, string> = {
  table: '🪑 Mesa', pickup: '🛍️ Recoger', delivery: '🛵 Domicilio',
}

export function buildProductsWithExtras(categories: SimpleCategory[]): ProductWithExtras[] {
  return categories.flatMap(cat => {
    const catExtras: ExtraGroup[] = cat.category_extra_groups?.map(ceg => ceg.extra_groups) ?? []
    return cat.products.filter(p => p.is_available).map(p => ({
      ...p,
      allExtras: [
        ...catExtras,
        ...(p.product_extra_groups?.map(peg => peg.extra_groups) ?? []),
      ],
    }))
  })
}

// ── Product browser (shared UI) ────────────────────────────────────────────
export function ProductBrowser({
  categories,
  cart,
  search, setSearch,
  activeCat, setActiveCat,
  onAdd, onDecrement,
}: {
  categories: SimpleCategory[]
  cart: CartEntry[]
  search: string; setSearch: (v: string) => void
  activeCat: string; setActiveCat: (v: string) => void
  onAdd: (p: ProductWithExtras) => void
  onDecrement: (p: ProductWithExtras) => void
}) {
  const allProducts = buildProductsWithExtras(categories)
  const visibleProducts = allProducts.filter(p => {
    const matchCat = activeCat === 'all' ||
      categories.find(c => c.id === activeCat)?.products.some(cp => cp.id === p.id)
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })
  const totalQtyForProduct = (pid: string) =>
    cart.filter(e => e.product.id === pid).reduce((s, e) => s + e.quantity, 0)

  return (
    <>
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar producto..."
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black mb-3"
      />
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 mb-3">
        <button onClick={() => setActiveCat('all')}
          className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            activeCat === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>Todos</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(cat.id)}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeCat === cat.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{cat.name}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {visibleProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin productos</p>
        ) : visibleProducts.map(product => {
          const qty = totalQtyForProduct(product.id)
          const hasExtras = product.allExtras.length > 0
          return (
            <div key={product.id}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-gray-400">
                  ${fmt(product.price)}
                  {hasExtras && <span className="ml-1 text-gray-300">· con opciones</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!hasExtras && qty > 0 ? (
                  <>
                    <button onClick={() => onDecrement(product)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{qty}</span>
                    <button onClick={() => onAdd(product)}
                      className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700">
                      <Plus size={12} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => onAdd(product)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      qty > 0
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Extras step (shared UI) ────────────────────────────────────────────────
export function ExtrasStep({
  product,
  draftQty, setDraftQty,
  draftExtras, toggleExtra,
  extrasValid,
  onConfirm, onBack,
}: {
  product: ProductWithExtras
  draftQty: number; setDraftQty: (n: number) => void
  draftExtras: Record<string, SelectedExtra[]>
  toggleExtra: (group: ExtraGroup, option: ExtraOption) => void
  extrasValid: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  const extrasPrice = Object.values(draftExtras).flat().reduce((s, e) => s + e.option.price_add, 0)
  const subtotal = (product.price + extrasPrice) * draftQty

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-gray-700">Cantidad</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setDraftQty(Math.max(1, draftQty - 1))}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <Minus size={14} />
            </button>
            <span className="text-base font-bold w-6 text-center">{draftQty}</span>
            <button onClick={() => setDraftQty(draftQty + 1)}
              className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {product.allExtras.map(group => (
          <div key={group.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-800">{group.name}</p>
              {group.is_required
                ? <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-medium">Requerido</span>
                : <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">Opcional</span>
              }
              {group.is_multiple && <span className="text-[10px] text-gray-400">· Varios</span>}
            </div>
            <div className="flex flex-col gap-1">
              {group.extra_options.map(option => {
                const selected = (draftExtras[group.id] ?? []).some(e => e.option.id === option.id)
                return (
                  <button key={option.id} onClick={() => toggleExtra(group, option)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      selected ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}>
                    <span className={selected ? 'font-medium text-gray-900' : 'text-gray-700'}>{option.name}</span>
                    <div className="flex items-center gap-2">
                      {option.price_add > 0 && (
                        <span className="text-xs text-gray-400">+${fmt(option.price_add)}</span>
                      )}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected ? 'border-gray-900 bg-gray-900' : 'border-gray-200'
                      }`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
          <ShoppingBag size={14} />
          Subtotal: <span className="font-bold text-gray-900">${fmt(subtotal)}</span>
        </p>
        <div className="flex gap-2">
          <button onClick={onBack}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
            Volver
          </button>
          <button onClick={onConfirm} disabled={!extrasValid}
            className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40">
            Agregar al pedido
          </button>
        </div>
      </div>
    </>
  )
}

// ── Extras state helpers ───────────────────────────────────────────────────
export function useExtrasState() {
  const [pendingProduct, setPendingProduct] = useState<ProductWithExtras | null>(null)
  const [draftExtras, setDraftExtras] = useState<Record<string, SelectedExtra[]>>({})
  const [draftQty, setDraftQty] = useState(1)

  function openExtrasFor(product: ProductWithExtras) {
    setPendingProduct(product)
    setDraftExtras({})
    setDraftQty(1)
  }

  function toggleExtra(group: ExtraGroup, option: ExtraOption) {
    setDraftExtras(prev => {
      const current = prev[group.id] ?? []
      if (group.is_multiple) {
        const has = current.some(e => e.option.id === option.id)
        return {
          ...prev,
          [group.id]: has
            ? current.filter(e => e.option.id !== option.id)
            : [...current, { groupId: group.id, option }],
        }
      } else {
        const has = current.some(e => e.option.id === option.id)
        return { ...prev, [group.id]: has ? [] : [{ groupId: group.id, option }] }
      }
    })
  }

  const extrasValid = pendingProduct
    ? pendingProduct.allExtras.filter(g => g.is_required).every(g => (draftExtras[g.id] ?? []).length > 0)
    : false

  return { pendingProduct, setPendingProduct, draftExtras, draftQty, setDraftQty, openExtrasFor, toggleExtra, extrasValid }
}

// ── Cart helpers ───────────────────────────────────────────────────────────
export function addToCart(
  cart: CartEntry[],
  product: ProductWithExtras,
  quantity: number,
  extras: SelectedExtra[]
): CartEntry[] {
  const sortedIds = extras.map(e => e.option.id).sort().join('_')
  const cartKey = sortedIds ? `${product.id}_${sortedIds}` : product.id
  const exists = cart.find(e => e.cartKey === cartKey)
  if (exists) return cart.map(e => e.cartKey === cartKey ? { ...e, quantity: e.quantity + quantity } : e)
  return [...cart, { cartKey, product, quantity, extras }]
}

export function setCartEntryQty(cart: CartEntry[], cartKey: string, qty: number): CartEntry[] {
  if (qty <= 0) return cart.filter(e => e.cartKey !== cartKey)
  return cart.map(e => e.cartKey === cartKey ? { ...e, quantity: qty } : e)
}

export function cartTotal(cart: CartEntry[]): number {
  return cart.reduce((s, entry) => {
    const extrasSum = entry.extras.reduce((es, e) => es + e.option.price_add, 0)
    return s + (entry.product.price + extrasSum) * entry.quantity
  }, 0)
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AddItemsToOrderModal({
  order,
  categories,
  onClose,
  onItemsAdded,
}: {
  order: Order
  categories: SimpleCategory[]
  onClose: () => void
  onItemsAdded: (updatedOrder: Order, newStatus?: 'preparing') => void
}) {
  const supabase = createClient()

  const [step, setStep] = useState<'edit' | 'extras' | 'confirm-prep'>('edit')
  const [existingQtys, setExistingQtys] = useState<Record<string, number>>(
    Object.fromEntries(order.order_items.map(i => [i.id, i.quantity]))
  )
  const [newCart, setNewCart] = useState<CartEntry[]>([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [saving, setSaving] = useState(false)

  const extras = useExtrasState()

  // ── Cart handlers ──────────────────────────────────────────────────────
  function handleAddProduct(product: ProductWithExtras) {
    if (product.allExtras.length > 0) {
      extras.openExtrasFor(product)
      setStep('extras')
    } else {
      setNewCart(prev => addToCart(prev, product, 1, []))
    }
  }

  function handleDecrementNoExtras(product: ProductWithExtras) {
    setNewCart(prev => setCartEntryQty(prev, product.id, (prev.find(e => e.cartKey === product.id)?.quantity ?? 1) - 1))
  }

  function confirmExtras() {
    if (!extras.pendingProduct) return
    const selectedExtras = Object.values(extras.draftExtras).flat()
    setNewCart(prev => addToCart(prev, extras.pendingProduct!, extras.draftQty, selectedExtras))
    extras.setPendingProduct(null)
    setStep('edit')
  }

  // ── Totals ─────────────────────────────────────────────────────────────
  const existingTotal = order.order_items.reduce((s, item) => {
    const extrasSum = item.order_item_extras.reduce((es, e) => es + e.extra_price, 0)
    return s + (item.unit_price + extrasSum) * (existingQtys[item.id] ?? 0)
  }, 0)
  const newTotal = cartTotal(newCart)
  const grandTotal = existingTotal + newTotal

  const hasChanges = newCart.length > 0 ||
    order.order_items.some(item => existingQtys[item.id] !== item.quantity)

  // ── Save ───────────────────────────────────────────────────────────────
  function handleSaveClick() {
    if (newCart.length > 0 && order.status === 'ready') {
      setStep('confirm-prep')
    } else {
      doSave(false)
    }
  }

  async function doSave(requiresPrep: boolean) {
    setSaving(true)

    const toDelete = order.order_items.filter(item => existingQtys[item.id] === 0)
    const toUpdate = order.order_items.filter(
      item => existingQtys[item.id] > 0 && existingQtys[item.id] !== item.quantity
    )
    for (const item of toDelete) await supabase.from('order_items').delete().eq('id', item.id)
    for (const item of toUpdate) await supabase.from('order_items').update({ quantity: existingQtys[item.id] }).eq('id', item.id)

    if (newCart.length > 0) {
      const { data: insertedItems } = await supabase
        .from('order_items')
        .insert(newCart.map(e => ({
          order_id: order.id,
          product_id: e.product.id,
          product_name: e.product.name,
          unit_price: e.product.price,
          quantity: e.quantity,
        })))
        .select('id')

      if (insertedItems) {
        const extrasToInsert = insertedItems.flatMap((inserted, idx) =>
          (newCart[idx]?.extras ?? []).map(e => ({
            order_item_id: inserted.id,
            extra_name: e.option.name,
            extra_price: e.option.price_add,
          }))
        )
        if (extrasToInsert.length > 0) {
          await supabase.from('order_item_extras').insert(extrasToInsert)
        }
      }
    }

    await supabase.from('orders').update({ total: grandTotal }).eq('id', order.id)

    const { data: refreshed } = await supabase
      .from('orders').select('*, order_items(*, order_item_extras(*))').eq('id', order.id).single()

    onItemsAdded(refreshed as Order, requiresPrep ? 'preparing' : undefined)
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
            ) : (
              <>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Pencil size={15} className="text-gray-400" />
                  Editar pedido
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ORDER_TYPE_LABEL[order.order_type]}
                  {order.table_number ? ` · ${order.table_number}` : ''}
                  {order.customer_name ? ` · ${order.customer_name}` : ''}
                </p>
              </>
            )}
          </div>
          <button
            onClick={step === 'extras' ? () => setStep('edit') : onClose}
            className="text-gray-400 hover:text-gray-600 p-1">
            {step === 'extras' ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
        </div>

        {/* ── confirm-prep step ─────────────────────────────────── */}
        {step === 'confirm-prep' && (
          <div className="flex-1 flex flex-col px-5 py-6">
            <p className="text-2xl mb-4">👨‍🍳</p>
            <h3 className="font-bold text-base mb-1">¿Los nuevos ítems requieren preparación?</h3>
            <p className="text-sm text-gray-400 mb-5">
              El pedido ya estaba listo. Si los nuevos ítems necesitan cocina, vuelve a preparación.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-6 flex flex-col gap-1.5">
              {newCart.map(entry => (
                <div key={entry.cartKey} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">{entry.quantity}× {entry.product.name}</span>
                    <span className="text-gray-500">
                      ${fmt((entry.product.price + entry.extras.reduce((s, e) => s + e.option.price_add, 0)) * entry.quantity)}
                    </span>
                  </div>
                  {entry.extras.length > 0 && (
                    <p className="text-xs text-gray-400 pl-3">+ {entry.extras.map(e => e.option.name).join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={() => doSave(true)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <ChefHat size={16} />
                {saving ? 'Guardando...' : 'Sí, mandar a preparar'}
              </button>
              <button onClick={() => doSave(false)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                <Zap size={16} />
                {saving ? 'Guardando...' : 'No, entregar directo'}
              </button>
              <button onClick={() => setStep('edit')} disabled={saving}
                className="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                Volver a editar
              </button>
            </div>
          </div>
        )}

        {/* ── extras step ──────────────────────────────────────── */}
        {step === 'extras' && extras.pendingProduct && (
          <ExtrasStep
            product={extras.pendingProduct}
            draftQty={extras.draftQty}
            setDraftQty={extras.setDraftQty}
            draftExtras={extras.draftExtras}
            toggleExtra={extras.toggleExtra}
            extrasValid={extras.extrasValid}
            onConfirm={confirmExtras}
            onBack={() => setStep('edit')}
          />
        )}

        {/* ── edit step ─────────────────────────────────────────── */}
        {step === 'edit' && (
          <>
            <div className="flex-1 overflow-y-auto">

              {/* Ítems actuales */}
              <div className="px-5 pt-4 pb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ítems actuales</p>
                {order.order_items.length === 0 ? (
                  <p className="text-sm text-gray-300 text-center py-4">Sin ítems</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {order.order_items.map(item => {
                      const qty = existingQtys[item.id] ?? 0
                      const removed = qty === 0
                      return (
                        <div key={item.id}
                          className={`flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 transition-opacity ${removed ? 'opacity-30' : ''}`}>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${removed ? 'line-through' : ''}`}>
                              {item.product_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              ${fmt(item.unit_price)} c/u
                              {item.order_item_extras.length > 0 && (
                                <span className="ml-1 text-gray-300">
                                  · {item.order_item_extras.map(e => e.extra_name).join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setExistingQtys(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Minus size={12} />
                            </button>
                            <span className={`text-sm font-bold w-5 text-center ${removed ? 'text-red-400' : ''}`}>{qty}</span>
                            <button
                              onClick={() => setExistingQtys(prev => ({ ...prev, [item.id]: qty + 1 }))}
                              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Nuevos ítems a agregar */}
              {newCart.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">A agregar</p>
                  <div className="flex flex-col gap-1">
                    {newCart.map(entry => (
                      <div key={entry.cartKey}
                        className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-green-700">{entry.product.name}</p>
                          {entry.extras.length > 0 && (
                            <p className="text-xs text-gray-400">{entry.extras.map(e => e.option.name).join(', ')}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            ${fmt(entry.product.price + entry.extras.reduce((s, e) => s + e.option.price_add, 0))} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setNewCart(prev => setCartEntryQty(prev, entry.cartKey, entry.quantity - 1))}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500">
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{entry.quantity}</span>
                          <button
                            onClick={() => setNewCart(prev => setCartEntryQty(prev, entry.cartKey, entry.quantity + 1))}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar más */}
              <div className="px-5 pt-2 pb-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 pt-3">Agregar más</p>
                <ProductBrowser
                  categories={categories}
                  cart={newCart}
                  search={search} setSearch={setSearch}
                  activeCat={activeCat} setActiveCat={setActiveCat}
                  onAdd={handleAddProduct}
                  onDecrement={handleDecrementNoExtras}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0">
              {hasChanges && (
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <ShoppingBag size={14} />
                  Total actualizado: <span className="font-bold text-gray-900">${fmt(grandTotal)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSaveClick} disabled={!hasChanges || saving}
                  className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
