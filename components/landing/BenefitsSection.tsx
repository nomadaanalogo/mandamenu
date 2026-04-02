'use client'

import { useEffect, useRef } from 'react'
import { QrCode, Zap, BarChart2, MapPin } from 'lucide-react'

const BENEFITS = [
  {
    icon: QrCode,
    num: '01',
    title: 'Menú digital con QR',
    desc: 'Tus clientes ven el menú desde el celular. Sin apps, sin papel, sin reprints.',
  },
  {
    icon: Zap,
    num: '02',
    title: 'Pedidos en tiempo real',
    desc: 'Cada pedido llega directo a cocina. Sin intermediarios, sin errores.',
  },
  {
    icon: BarChart2,
    num: '03',
    title: 'Panel de ventas',
    desc: 'Ve cuánto vendiste, qué se vende más y toma decisiones con datos reales.',
  },
  {
    icon: MapPin,
    num: '04',
    title: 'Order tracking',
    desc: 'Tus clientes siguen su pedido en vivo. Menos "¿y mi comida?" en la mesa.',
  },
]

function BenefitItem({ icon: Icon, num, title, desc, index }: typeof BENEFITS[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: 'translateY(32px)',
        transition: `opacity 0.6s ease ${index * 120}ms, transform 0.6s ease ${index * 120}ms`,
      }}
      className="flex items-start gap-6 py-8 border-b border-gray-200 last:border-0"
    >
      <span className="text-sm font-bold text-gray-300 w-8 shrink-0 pt-1">{num}</span>
      <div className="w-10 h-10 rounded-2xl border border-gray-200 flex items-center justify-center shrink-0">
        <Icon size={18} strokeWidth={1.5} className="text-orange-500" />
      </div>
      <div className="flex-1">
        <h3 className="font-black text-lg mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function BenefitsSection() {
  return (
    <div className="flex flex-col">
      {BENEFITS.map((b, i) => (
        <BenefitItem key={b.num} {...b} index={i} />
      ))}
    </div>
  )
}
