'use client'

import { useState } from 'react'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

interface ExtraOption { id: string; name: string; price_add: number }
interface ExtraGroup {
  id: string; name: string; is_required: boolean; is_multiple: boolean
  extra_options: ExtraOption[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  is_available: boolean; is_featured: boolean
  product_extra_groups?: { extra_groups: ExtraGroup }[]
}
interface Category {
  id: string; name: string
  products: Product[]
  category_extra_groups?: { extra_groups: ExtraGroup }[]
}
interface Location {
  id: string; whatsapp: string; name: string
  address: string | null; city: string | null; schedule: string | null
  allows_table: boolean; allows_pickup: boolean; allows_delivery: boolean
}
interface Restaurant {
  id: string; name: string; slug: string
  primary_color: string; secondary_color: string
  logo_url: string | null; instagram_handle: string | null
  currency?: string; dark_mode?: boolean
}
interface SelectedExtra { groupId: string; option: ExtraOption }
interface CartItem {
  cartId: string
  product: Product; quantity: number; extras: SelectedExtra[]
  categoryExtras: ExtraGroup[]; productExtras: ExtraGroup[]
}

// ── utilidades ──────────────────────────────────────────────────────────────
function itemTotal(item: CartItem) {
  const extrasSum = item.extras.reduce((s, e) => s + e.option.price_add, 0)
  return (item.product.price + extrasSum) * item.quantity
}

// ── componente principal ─────────────────────────────────────────────────────
export default function MenuPublic({ restaurant, categories, featured, location }: {
  restaurant: Restaurant; categories: Category[]
  featured: Product[]; location: Location
}) {
  const primary   = restaurant.primary_color   || '#000000'
  const secondary = restaurant.secondary_color || primary
  const currency  = restaurant.currency ?? 'USD'
  const dark      = restaurant.dark_mode ?? false

  // Tokens de color según modo
  const bg        = dark ? '#0a0a0a' : '#f9fafb'
  const surface   = dark ? '#1a1a1a' : '#ffffff'
  const border    = dark ? '#2a2a2a' : '#f3f4f6'
  const textMain  = dark ? '#f5f5f5' : '#111827'
  const textSub   = dark ? '#9ca3af' : '#6b7280'

  // carrito
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  // checkout
  const allowedTypes = (
    [
      location?.allows_table    !== false ? 'table'    : null,
      location?.allows_pickup   !== false ? 'pickup'   : null,
      location?.allows_delivery !== false ? 'delivery' : null,
    ] as const
  ).filter((t): t is 'table' | 'pickup' | 'delivery' => t !== null)

  const [orderType, setOrderType] = useState<'table' | 'pickup' | 'delivery'>(allowedTypes[0] ?? 'table')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

  // modal producto
  const [selectedProduct, setSelectedProduct] = useState<{
    product: Product; categoryExtras: ExtraGroup[]; productExtras: ExtraGroup[]
  } | null>(null)

  // filtro de categoría activa (null = todas)
  const [activeCat, setActiveCat] = useState<string | null>(null)

  // acordeón (todas abiertas cuando no hay filtro, solo la activa cuando hay filtro)
  const [openCats, setOpenCats] = useState<Set<string>>(() =>
    new Set(categories.map(c => c.id))
  )

  function toggleCat(id: string) {
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectCat(id: string | null) {
    setActiveCat(id)
    if (id) setOpenCats(new Set([id]))
    else setOpenCats(new Set(categories.map(c => c.id)))
  }

  function handleProductAdd(product: Product, category: Category) {
    const catPivot = category.category_extra_groups ?? []
    const prodPivot = product.product_extra_groups ?? []

    // check pivot entries first (they exist even if the join data is restricted)
    const hasPivotEntries = catPivot.length > 0 || prodPivot.length > 0

    if (!hasPivotEntries) {
      addToCart(product, [], [], [])
    } else {
      const categoryExtras = catPivot.map(ceg => ceg.extra_groups).filter(Boolean) as ExtraGroup[]
      const productExtras = prodPivot.map(peg => peg.extra_groups).filter(Boolean) as ExtraGroup[]
      setSelectedProduct({ product, categoryExtras, productExtras })
    }
  }

  function addToCart(product: Product, extras: SelectedExtra[], categoryExtras: ExtraGroup[], productExtras: ExtraGroup[]) {
    const cartId = `${product.id}_${extras.map(e => e.option.id).sort().join('_')}`
    setCart(prev => {
      const existing = prev.find(i => i.cartId === cartId)
      if (existing) return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { cartId, product, quantity: 1, extras, categoryExtras, productExtras }]
    })
    setSelectedProduct(null)
  }

  function updateQty(cartId: string, qty: number) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.cartId !== cartId))
    else setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, quantity: qty } : i))
  }

  const total = cart.reduce((s, i) => s + itemTotal(i), 0)
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  async function sendOrder() {
    if (!customerName.trim()) { alert('Ingresá tu nombre para continuar'); return }
    if (sending) return
    setSending(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: location.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        order_type: orderType,
        table_number: tableNumber || null,
        delivery_address: deliveryAddress || null,
        notes,
        items: cart.map(i => ({
          product_id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          extras: i.extras.map(e => ({ id: e.option.id, name: e.option.name, price: e.option.price_add })),
        })),
      }),
    })
    const data = await res.json()
    const url = buildWhatsAppUrl({
      whatsapp: location.whatsapp,
      restaurantName: restaurant.name,
      customerName,
      items: cart.map(i => ({
        name: i.product.name, quantity: i.quantity, price: i.product.price,
        extras: i.extras.map(e => ({ name: e.option.name, price: e.option.price_add })),
      })),
      notes,
    })
   // window.open(url, '_blank')
    window.location.href = `/pedido/${data.order_id}`
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg, color: textMain }}>

      {/* ── HEADER ── */}
      <div className="px-4 pt-5 pb-5" style={{
        backgroundColor: surface,
        boxShadow: `0 8px 24px -6px ${primary}40`
      }}>
        <div className="max-w-lg mx-auto flex items-stretch gap-4">
          {/* Logo */}
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt={restaurant.name}
              className="w-20 h-20 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: `${primary}15` }}>
              🍽️
            </div>
          )}

          {/* Info — alineada al tope de la imagen */}
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="font-black text-base leading-tight tracking-tight" style={{ color: textMain }}>{restaurant.name}</h1>
              {location?.name && (
                <span className="text-xs font-semibold" style={{ color: textSub }}>{location.name}</span>
              )}
            </div>
            {location?.schedule && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: textSub }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: secondary, flexShrink: 0 }}>
                  <circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1.5" strokeLinecap="round"/>
                </svg>
                {location.schedule}
              </span>
            )}
            {(location?.address || location?.city) && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: textSub }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: secondary, flexShrink: 0 }}>
                  <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.75 3.5 6.5 3.5 6.5s3.5-3.75 3.5-6.5C9.5 2.57 7.93 1 6 1z" strokeLinejoin="round"/>
                  <circle cx="6" cy="4.5" r="1.25"/>
                </svg>
                {[location?.address, location?.city].filter(Boolean).join(', ')}
              </span>
            )}
            {location?.whatsapp && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: textSub }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: secondary, flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {location.whatsapp}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── NAVEGACIÓN DE CATEGORÍAS ── */}
      <div className="sticky top-0 z-20 backdrop-blur-sm px-4 py-3" style={{ backgroundColor: `${bg}f2`, borderBottom: `1px solid ${border}` }}>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => selectCat(null)}
            className="text-xs px-3 py-1.5 rounded-full font-medium border transition-colors"
            style={activeCat === null
              ? { backgroundColor: primary, borderColor: primary, color: '#fff' }
              : { backgroundColor: surface, borderColor: border, color: textSub }}>
            Todas
          </button>
          {categories.filter(c => c.products.some(p => p.is_available)).map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCat(activeCat === cat.id ? null : cat.id)}
              className="text-xs px-3 py-1.5 rounded-full font-medium border transition-colors"
              style={activeCat === cat.id
                ? { backgroundColor: primary, borderColor: primary, color: '#fff' }
                : { backgroundColor: surface, borderColor: border, color: textSub }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-36">

        {/* Destacados */}
        {featured.length > 0 && (
          <div id="section-destacados" className="mb-4 scroll-mt-20">
            <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">⭐ Destacados</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {featured.map(p => {
                const cat = categories.find(c => c.products.some(pr => pr.id === p.id))
                return (
                  <div key={p.id}
                    className="shrink-0 w-40 rounded-2xl shadow-sm overflow-hidden cursor-pointer"
                    style={{ backgroundColor: surface, border: `1px solid ${border}` }}
                    onClick={() => cat && handleProductAdd(p, cat)}>
                    <div className="h-24 flex items-center justify-center text-4xl"
                      style={{ backgroundColor: `${primary}15` }}>
                      🍽️
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: textMain }}>{p.name}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: primary }}>${fmt(p.price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categorías acordeón */}
        <div className="flex flex-col gap-2">
          {categories.filter(cat => !activeCat || cat.id === activeCat).map(cat => {
            const availableProducts = cat.products.filter(p => p.is_available)
            if (availableProducts.length === 0) return null
            const isOpen = openCats.has(cat.id)

            return (
              <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-20">
                {/* Header acordeón */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center gap-3 py-2 px-1">
                  <div className="flex-1 h-px" style={{ backgroundColor: border }} />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: textMain }}>
                      {cat.name}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: textSub }}>
                      ({availableProducts.length})
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ backgroundColor: border }} />
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" className="shrink-0 transition-transform"
                    style={{ color: textSub, transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="M3 6l5 5 5-5"/>
                  </svg>
                </button>

                {/* Productos */}
                {isOpen && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    {availableProducts.map(p => (
                      <ProductCard key={p.id} product={p} primary={primary} secondary={secondary} currency={currency}
                        surface={surface} border={border} textMain={textMain} textSub={textSub}
                        onAdd={() => handleProductAdd(p, cat)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Instagram */}
        {restaurant.instagram_handle && (
          <div className="mt-10 text-center">
            <a href={`https://instagram.com/${restaurant.instagram_handle}`} target="_blank"
              className="text-xs text-gray-400 hover:text-gray-600">
              @{restaurant.instagram_handle}
            </a>
          </div>
        )}

        {/* Footer MandaMenu */}
        <div className="mt-10 mb-2 text-center">
          <a href="https://mandamenu.com" target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-gray-400 transition-colors">
            Creado con amor por
            <span className="font-semibold text-gray-400">MandaMenu</span>
          </a>
        </div>
      </div>

      {/* ── BOTÓN CARRITO FLOTANTE ── */}
      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-linear-to-t from-gray-50 via-gray-50">
          <button
            onClick={() => setShowCart(true)}
            style={{ backgroundColor: secondary }}
            className="w-full max-w-lg mx-auto flex items-center justify-between text-white px-5 py-4 rounded-2xl shadow-xl">
            <span className="bg-white/20 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
            <span className="font-semibold text-sm">Ver pedido</span>
            <span className="font-bold">${fmt(total)}</span>
          </button>
        </div>
      )}

      {/* ── CARRITO ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />

          {/* Sheet */}
          <div className="relative rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col w-full sm:max-w-md"
            style={{ backgroundColor: surface }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: border }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
              <h2 className="font-bold text-lg" style={{ color: textMain }}>Tu pedido</h2>
              <button onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: border, color: textSub }}>
                ✕
              </button>
            </div>

            {/* Scroll area */}
            <div className="overflow-y-auto flex-1 px-5">
              {/* Items */}
              <div className="py-3 flex flex-col gap-3">
                {cart.map(item => (
                  <div key={item.cartId} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight" style={{ color: textMain }}>{item.product.name}</p>
                      {item.extras.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: textSub }}>
                          {item.extras.map(e => e.option.name).join(' · ')}
                        </p>
                      )}
                      <p className="text-sm font-semibold mt-1" style={{ color: primary }}>
                        ${fmt(itemTotal(item))}
                      </p>
                    </div>
                    {/* Controles cantidad */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(item.cartId, item.quantity - 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ border: `1px solid ${border}`, color: textMain }}>
                        −
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.cartId, item.quantity + 1)}
                        style={{ backgroundColor: secondary }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm">
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separador */}
              <div className="my-3 border-t border-dashed" style={{ borderColor: border }} />

              {/* Tipo de pedido */}
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textSub }}>¿Cómo lo querés?</p>
              <div className={`grid gap-2 mb-3 ${allowedTypes.length === 1 ? 'grid-cols-1' : allowedTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {[
                  { key: 'table',    label: 'Mesa',      icon: '🪑' },
                  { key: 'pickup',   label: 'Recoger',   icon: '🛍️' },
                  { key: 'delivery', label: 'Domicilio', icon: '🛵' },
                ].filter(opt => allowedTypes.includes(opt.key as 'table' | 'pickup' | 'delivery')).map(opt => (
                  <button key={opt.key} onClick={() => setOrderType(opt.key as 'table' | 'pickup' | 'delivery')}
                    className="flex flex-col items-center py-3 rounded-xl border text-xs font-semibold transition-all"
                    style={orderType === opt.key
                      ? { backgroundColor: primary, borderColor: primary, color: '#fff' }
                      : { borderColor: border, color: textSub }}>
                    <span className="text-xl mb-1">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Campos */}
              <div className="flex flex-col gap-2.5">
                {orderType === 'table' && (
                  <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                    placeholder="Número de mesa (opcional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                )}
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Tu nombre *"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder={orderType === 'table' ? 'Tu WhatsApp (opcional)' : 'Tu WhatsApp *'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                {orderType === 'delivery' && (
                  <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Dirección de entrega *"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
                )}
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="¿Alguna nota para tu pedido?" rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 resize-none" />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-4 mt-2">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold">${fmt(total)}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100">
              <button onClick={sendOrder} disabled={sending}
                style={{ backgroundColor: primary }}
                className="w-full text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? (
                  'Enviando...'
                ) : (
                  <>
                    <span>Confirmar pedido</span>
                    
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct.product}
          categoryExtras={selectedProduct.categoryExtras}
          productExtras={selectedProduct.productExtras}
          primary={primary}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  )
}

// ── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, primary, secondary, currency, surface, border, textMain, textSub, onAdd }: {
  product: Product; primary: string; secondary: string; currency: string
  surface: string; border: string; textMain: string; textSub: string
  onAdd: () => void
}) {
  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })
  return (
    <div className="rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3"
      style={{ backgroundColor: surface, border: `1px solid ${border}` }}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight" style={{ color: textMain }}>{product.name}</p>
        {product.description && (
          <p className="text-xs mt-0.5 line-clamp-2 leading-relaxed" style={{ color: textSub }}>{product.description}</p>
        )}
        <p className="text-sm font-bold mt-1.5" style={{ color: primary }}>${fmt(product.price)}</p>
      </div>
      <button onClick={onAdd}
        style={{ backgroundColor: secondary }}
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl shadow-sm active:scale-95 transition-transform">
        +
      </button>
    </div>
  )
}

// ── PRODUCT MODAL ─────────────────────────────────────────────────────────────
function ProductModal({ product, categoryExtras, productExtras, primary, currency, onClose, onAdd }: {
  product: Product; categoryExtras: ExtraGroup[]; productExtras: ExtraGroup[]
  primary: string; currency: string
  onClose: () => void
  onAdd: (product: Product, extras: SelectedExtra[], categoryExtras: ExtraGroup[], productExtras: ExtraGroup[]) => void
}) {
  const [selected, setSelected] = useState<SelectedExtra[]>([])
  const allGroups = [...categoryExtras, ...productExtras]
  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 })

  function toggleOption(group: ExtraGroup, option: ExtraOption) {
    if (group.is_multiple) {
      const exists = selected.find(s => s.option.id === option.id)
      setSelected(exists ? selected.filter(s => s.option.id !== option.id) : [...selected, { groupId: group.id, option }])
    } else {
      const filtered = selected.filter(s => s.groupId !== group.id)
      const exists = selected.find(s => s.option.id === option.id)
      setSelected(exists ? filtered : [...filtered, { groupId: group.id, option }])
    }
  }

  function canAdd() {
    return allGroups.filter(g => g.is_required).every(g => selected.some(s => s.groupId === g.id))
  }

  const extrasTotal = selected.reduce((s, e) => s + e.option.price_add, 0)
  const ok = canAdd()

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] sm:max-h-[85vh] flex flex-col w-full sm:max-w-md">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="font-bold text-xl leading-tight">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{product.description}</p>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm shrink-0 mt-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* Extras scroll */}
        <div className="overflow-y-auto flex-1 px-5">
          {allGroups.map(group => (
            <div key={group.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <p className="font-semibold text-sm">{group.name}</p>
                {group.is_required && (
                  <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">Obligatorio</span>
                )}
                {group.is_multiple && (
                  <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Varios</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {group.extra_options.map(option => {
                  const isSel = selected.some(s => s.option.id === option.id)
                  return (
                    <button key={option.id} onClick={() => toggleOption(group, option)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                        isSel ? 'border-transparent font-medium' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={isSel ? { backgroundColor: `${primary}15`, borderColor: primary, color: primary } : {}}>
                      <span>{option.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={isSel ? '' : 'text-gray-400'}>
                          {option.price_add > 0 ? `+$${fmt(option.price_add)}` : 'Incluido'}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSel ? 'border-transparent' : 'border-gray-300'
                        }`} style={isSel ? { backgroundColor: primary } : {}}>
                          {isSel && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Precio</span>
            <span className="text-xl font-bold">${fmt(product.price + extrasTotal)}</span>
          </div>
          <button
            onClick={() => onAdd(product, selected, categoryExtras, productExtras)}
            disabled={!ok}
            style={ok ? { backgroundColor: primary } : {}}
            className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all ${
              ok ? 'text-white active:scale-[0.98]' : 'bg-gray-100 text-gray-400'
            }`}>
            {ok ? 'Agregar al pedido' : 'Seleccioná las opciones obligatorias'}
          </button>
        </div>
      </div>
    </div>
  )
}
