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
  { key: 'pending',   label: 'Recibido',    desc: 'Tu pedido fue recibido' },
  { key: 'preparing', label: 'Preparando',  desc: 'Estamos preparando tu pedido' },
  { key: 'ready',     label: 'Listo',       desc: 'Tu pedido está listo' },
  { key: 'delivered', label: 'Entregado',   desc: 'Pedido entregado' },
]

const STATUS_INDEX: Record<string, number> = {
  pending: 0, preparing: 1, ready: 2, delivered: 3,
}

export default function OrderTracker({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const supabase = createClient()

  const restaurant = order.locations?.restaurants
  const primary = restaurant?.primary_color || '#000000'
  const currentStep = STATUS_INDEX[order.status]

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
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: primary }} className="text-white p-6 text-center">
        {restaurant?.logo_url && (
          <img src={restaurant.logo_url} alt={restaurant.name}
            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover border-2 border-white" />
        )}
        <h1 className="text-xl font-bold">{restaurant?.name}</h1>
        <p className="text-sm opacity-80 mt-1">Seguimiento de pedido</p>
      </div>

      <div className="max-w-md mx-auto p-6">

        {/* Estado actual */}
       
  
       
        <div className="bg-white rounded-2xl p-6 mb-4 text-center shadow-sm">
          <div className="text-5xl mb-3">
            {order.status === 'pending'   && '⏳'}
            {order.status === 'preparing' && '👨‍🍳'}
            {order.status === 'ready'     && '✅'}
            {order.status === 'delivered' && '🎉'}
          </div>
          <h2 className="text-xl font-bold mb-1">
            {STEPS[currentStep].label}
          </h2>
          <p className="text-sm text-gray-500">{STEPS[currentStep].desc}</p>

          {order.status === 'ready' && (
            <div className="mt-4 bg-green-50 text-green-700 text-sm p-3 rounded-xl">
              ¡Tu pedido está listo! Pasá a buscarlo.
            </div>
          )}
        </div>

        {/* Tracker de pasos */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <div className="relative">
            {/* línea de fondo */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
            {/* línea de progreso */}
            <div
              className="absolute top-4 left-4 h-0.5 transition-all duration-700"
              style={{
                backgroundColor: primary,
                width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                right: 'auto',
              }}
            />
            <div className="relative flex justify-between">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 z-10"
                    style={{
                      backgroundColor: i <= currentStep ? primary : '#e5e7eb',
                      color: i <= currentStep ? 'white' : '#9ca3af',
                    }}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs text-center ${i <= currentStep ? 'font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detalle del pedido */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <h3 className="font-semibold mb-3">Tu pedido</h3>

          <div className="flex flex-col gap-2 mb-4">
            {order.order_items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
                {item.order_item_extras.map((extra) => (
                  <p key={extra.id} className="text-xs text-gray-400 pl-3">
                    + {extra.extra_name} {extra.extra_price > 0 ? `(+$${extra.extra_price.toFixed(2)})` : ''}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>

          {order.order_type === 'table' && order.table_number && (
            <p className="text-xs text-gray-400 mt-2">🪑 Mesa {order.table_number}</p>
          )}
          {order.order_type === 'delivery' && order.delivery_address && (
            <p className="text-xs text-gray-400 mt-2">📍 {order.delivery_address}</p>
          )}
          {order.notes && (
            <p className="text-xs text-gray-400 mt-2 italic">"{order.notes}"</p>
          )}
        </div>


{(() => {
  const msg = `Hola! Quería consultar por mi pedido #${order.id.slice(0, 8).toUpperCase()}\n\n` +
    order.order_items.map((i) => `• ${i.quantity}x ${i.product_name}`).join('\n') +
    `\n\nTotal: $${order.total.toFixed(2)}`
  const number = (order.locations?.whatsapp || '').replace(/\D/g, '')
  return (
    <a href={`https://wa.me/${number}?text=${encodeURIComponent(msg)}`} target="_blank"
      style={{ borderColor: primary, color: primary }}
      className="flex items-center justify-center gap-2 w-full border rounded-xl py-3 text-sm font-medium mt-2">
      Consultar por mi pedido
    </a>
  )
})()}

        {/* Número de pedido */}
        <p className="text-center text-xs text-gray-300">
          Pedido #{order.id.slice(0, 8).toUpperCase()}
        </p>

  


      </div>
    </div>
  )
}