'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  customer_name: string | null
  total: number
  order_type: 'table' | 'pickup' | 'delivery'
  table_number: string | null
  delivery_address: string | null
  notes: string | null
  created_at: string
  order_items: {
    id: string
    product_name: string
    quantity: number
    unit_price: number
    order_item_extras: { id: string; extra_name: string; extra_price: number }[]
  }[]
  locations: {
    whatsapp: string
    restaurants: {
      name: string
      primary_color: string
      logo_url: string | null
    }
  }
}

const STEPS = [
  { key: 'pending',   label: 'Recibido',   emoji: '📋' },
  { key: 'preparing', label: 'Preparando', emoji: '👨‍🍳' },
  { key: 'ready',     label: 'Listo',      emoji: '✅' },
  { key: 'delivered', label: 'Entregado',  emoji: '🎉' },
]

const STATUS_INDEX: Record<string, number> = {
  pending: 0, preparing: 1, ready: 2, delivered: 3,
}

const STATUS_BG: Record<string, string> = {
  pending:   'bg-amber-50 border-amber-200',
  preparing: 'bg-blue-50 border-blue-200',
  ready:     'bg-green-50 border-green-200',
  delivered: 'bg-gray-50 border-gray-200',
}

const STATUS_TEXT: Record<string, string> = {
  pending:   'text-amber-700',
  preparing: 'text-blue-700',
  ready:     'text-green-700',
  delivered: 'text-gray-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pedido recibido',
  preparing: 'En preparación',
  ready:     '¡Tu pedido está listo!',
  delivered: 'Pedido entregado',
}

const STATUS_DESC: Record<string, string> = {
  pending:   'Lo recibimos, en breve empieza la magia.',
  preparing: 'Ya estamos trabajando en ello.',
  ready:     'Pasá a buscarlo o te lo llevamos en un momento.',
  delivered: 'Esperamos que lo hayas disfrutado. ¡Volvé pronto!',
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function OrderTracker({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const supabase = createClient()

  const restaurant = order.locations?.restaurants
  const primary = restaurant?.primary_color || '#f97316'
  const currentStep = STATUS_INDEX[order.status]

  const whatsappNumber = (order.locations?.whatsapp || '').replace(/\D/g, '')
  const whatsappMsg = `Hola! Quería consultar por mi pedido #${order.id.slice(0, 8).toUpperCase()}\n\n` +
    order.order_items.map((i) => `• ${i.quantity}x ${i.product_name}`).join('\n') +
    `\n\nTotal: $${order.total.toFixed(2)}`
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`

  useEffect(() => {
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${order.id}`,
      }, (payload) => {
        setOrder((prev) => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [order.id, supabase])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div style={{ backgroundColor: primary }} className="px-6 pt-10 pb-16 text-white text-center">
        {restaurant?.logo_url ? (
          <img src={restaurant.logo_url} alt={restaurant.name}
            className="w-14 h-14 rounded-full mx-auto mb-3 object-cover border-2 border-white/40 shadow-md" />
        ) : (
          <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-white/20 flex items-center justify-center text-2xl">
            🍽️
          </div>
        )}
        <h1 className="text-lg font-bold">{restaurant?.name}</h1>
        <p className="text-sm opacity-70 mt-0.5">
          Pedido #{order.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Content card lifted over header */}
      <div className="max-w-md mx-auto px-4 -mt-10 pb-10 flex flex-col gap-3">

        {/* Status card */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border ${STATUS_BG[order.status]} flex items-center gap-4`}>
          <div className="text-4xl shrink-0">{STEPS[currentStep].emoji}</div>
          <div className="flex-1 min-w-0">
            <p className={`font-black text-base leading-tight ${STATUS_TEXT[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{STATUS_DESC[order.status]}</p>
          </div>
        </div>

        {/* Step tracker */}
        <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
            <div
              className="absolute top-4 left-4 h-0.5 transition-all duration-700"
              style={{
                backgroundColor: primary,
                width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
              }}
            />
            <div className="relative flex justify-between">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 z-10 shadow-sm"
                    style={{
                      backgroundColor: i <= currentStep ? primary : '#f3f4f6',
                      color: i <= currentStep ? 'white' : '#9ca3af',
                    }}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-semibold ${i <= currentStep ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WhatsApp CTA — early and prominent */}
        {whatsappNumber && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-4 rounded-2xl text-sm transition-colors shadow-sm"
          >
            <WhatsAppIcon size={20} />
            Consultar por mi pedido
          </a>
        )}

        {/* Order detail */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black text-sm text-gray-400 uppercase tracking-wide mb-4">Tu pedido</h3>

          <div className="flex flex-col gap-3">
            {order.order_items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold">
                    <span className="text-gray-400 mr-1">{item.quantity}×</span>
                    {item.product_name}
                  </span>
                  <span className="text-sm font-black shrink-0 ml-2">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
                {item.order_item_extras.map((extra) => (
                  <p key={extra.id} className="text-xs text-gray-400 pl-4 mt-0.5">
                    + {extra.extra_name}{extra.extra_price > 0 ? ` (+$${extra.extra_price.toFixed(2)})` : ''}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
            <span className="font-semibold text-sm">Total</span>
            <span className="font-black">${order.total.toFixed(2)}</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-3">
            {order.order_type === 'table' && order.table_number && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>🪑</span> Mesa {order.table_number}
              </p>
            )}
            {order.order_type === 'delivery' && order.delivery_address && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>📍</span> {order.delivery_address}
              </p>
            )}
            {order.notes && (
              <p className="text-xs text-gray-400 italic flex items-start gap-1.5">
                <span>📝</span> &ldquo;{order.notes}&rdquo;
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
