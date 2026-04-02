import { Suspense } from 'react'
import Link from 'next/link'
import { UtensilsCrossed, QrCode, Zap, LayoutDashboard, RefreshCw } from 'lucide-react'
import RegisterForm from '@/components/auth/RegisterForm'

const BENEFITS = [
  {
    icon: QrCode,
    title: 'Menú digital con QR',
    desc: 'Tus clientes escanean y ven el menú actualizado al instante. Sin imprimir cartas nunca más.',
  },
  {
    icon: Zap,
    title: 'Pedidos en tiempo real',
    desc: 'Cada pedido llega directo a cocina. Sin papel, sin gritos, sin errores.',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel para cada sede',
    desc: 'Manejá múltiples sucursales desde un solo lugar, cada una con su propio panel.',
  },
  {
    icon: RefreshCw,
    title: 'Actualizá en segundos',
    desc: 'Cambiá precios, agregá productos o pausá items sin llamar a nadie.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <UtensilsCrossed size={14} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">MandaMenu</span>
        </div>
        <Link href="/login"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Iniciar sesión
        </Link>
      </nav>

      {/* Hero */}
      <section className="bg-gray-950 text-white px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <span className="text-xs font-medium bg-white/10 text-white/70 px-3 py-1 rounded-full tracking-wide uppercase">
            Menú digital para restaurantes
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Tu menú en el celular<br className="hidden md:block" /> de tus clientes
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Digitalizá tu carta, recibí pedidos en tiempo real y gestioná todo desde un panel simple.
          </p>
          <a href="#registro"
            className="mt-2 bg-white text-black px-7 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors">
            Empezar gratis
          </a>
        </div>
      </section>

      {/* Beneficios */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl font-bold mb-12">Todo lo que necesitás</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Registro */}
      <section id="registro" className="px-6 py-20 bg-gray-50">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Creá tu cuenta gratis</h2>
            <p className="text-sm text-gray-500 mt-2">Sin tarjeta de crédito. Listo en minutos.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <Suspense>
            <RegisterForm />
          </Suspense>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} MandaMenu — Todos los derechos reservados
      </footer>

    </div>
  )
}
