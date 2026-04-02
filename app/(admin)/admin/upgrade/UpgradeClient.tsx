'use client'

import { useState } from 'react'
import { Check, Loader2, Settings } from 'lucide-react'
import type { PlanLimits } from '@/lib/plans'

const PLANS = [
  {
    name: 'Basic',
    price: 15,
    description: '1 restaurante · 1 sede',
    features: [
      'Menú digital con QR',
      'Pedidos en tiempo real',
      '1 restaurante',
      '1 sede',
      'Panel de empleados',
    ],
  },
  {
    name: 'Standard',
    price: 29,
    description: '1 restaurante · Sedes ilimitadas',
    highlight: true,
    features: [
      'Menú digital con QR',
      'Pedidos en tiempo real',
      '1 restaurante',
      'Sedes ilimitadas',
      'Panel de empleados',
      'Importación de menú con IA',
    ],
  },
  {
    name: 'Premium',
    price: 49,
    description: 'Restaurantes ilimitados · Sedes ilimitadas',
    features: [
      'Menú digital con QR',
      'Pedidos en tiempo real',
      'Restaurantes ilimitados',
      'Sedes ilimitadas',
      'Panel de empleados',
      'Importación de menú con IA',
      'Soporte prioritario',
    ],
  },
]

export default function UpgradeClient({ limits }: { limits: PlanLimits }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  async function handlePortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPortalLoading(false)
  }

  async function handleSubscribe(planName: string) {
    setLoading(planName)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Elegí tu plan</h1>
          <p className="text-gray-400 mt-2">
            Actualmente estás en <span className="font-semibold text-gray-600">{limits.planName}</span>
            {limits.status === 'trial' && limits.trialEndsAt && (
              <span className="ml-2 text-amber-600 text-sm">
                · Trial hasta {new Date(limits.trialEndsAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = limits.planName === plan.name
            const isLoading = loading === plan.name

            return (
              <div key={plan.name}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${
                  plan.highlight
                    ? 'border-black shadow-lg ring-1 ring-black'
                    : 'border-gray-100'
                }`}>
                {plan.highlight && (
                  <div className="bg-black text-white text-center text-xs font-semibold py-1.5 tracking-wide">
                    MÁS POPULAR
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  <h2 className="font-bold text-lg text-gray-900">{plan.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-400 text-sm">/mes</span>
                  </div>

                  <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check size={14} className="text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full text-center py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500">
                      Plan actual
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.name)}
                      disabled={!!loading}
                      className={`w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        plan.highlight
                          ? 'bg-black text-white hover:bg-gray-800 disabled:opacity-60'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60'
                      }`}>
                      {isLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Redirigiendo...</>
                        : `Suscribirme al ${plan.name}`
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {limits.status === 'active' && (
          <div className="flex justify-center mt-6">
            <button onClick={handlePortal} disabled={portalLoading}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">
              {portalLoading
                ? <Loader2 size={14} className="animate-spin" />
                : <Settings size={14} />
              }
              Gestionar suscripción · cambiar tarjeta o cancelar
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Pagos seguros procesados por Stripe · Cancelá cuando quieras
        </p>
      </div>
    </div>
  )
}
