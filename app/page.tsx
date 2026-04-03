import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, QrCode, Zap, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import type { Metadata } from 'next'
import RegisterForm from '@/components/auth/RegisterForm'
import BenefitsSection from '@/components/landing/BenefitsSection'

export const metadata: Metadata = {
  title: 'MandaMenu — Menú digital con QR para restaurantes | Gratis 30 días',
  description: 'Creá tu menú digital con QR en minutos. Recibí pedidos en tiempo real por WhatsApp. Gestioná sedes, categorías y productos desde un panel simple. Ideal para restaurantes, food trucks y cocinas en Colombia, Argentina y México.',
  alternates: { canonical: 'https://mandamenu.com' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MandaMenu',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://mandamenu.com',
  description: 'Plataforma de menú digital con QR para restaurantes. Recibí pedidos en tiempo real, gestioná tu carta y tus sedes desde un panel simple.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Prueba gratuita de 30 días sin tarjeta de crédito',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '47',
  },
  featureList: [
    'Menú digital con código QR',
    'Pedidos en tiempo real',
    'Panel de gestión de pedidos',
    'Múltiples sedes',
    'Importación de menú con IA',
    'Integración con WhatsApp',
  ],
  areaServed: ['CO', 'AR', 'MX'],
  inLanguage: 'es',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F2ED] text-gray-950 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="MandaMenu" width={30} height={30} className="object-contain" />
          <span className="font-black text-lg tracking-tight">MandaMenu</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Iniciar sesión
          </Link>
          <a href="#registro"
            className="bg-gray-950 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors">
            Empezar gratis
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 pt-10 pb-0 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-[1fr_420px] lg:grid-cols-[1fr_480px] gap-10 items-end" style={{ minHeight: '88vh' }}>

          {/* Left: Copy */}
          <div className="flex flex-col justify-center gap-8 pb-20">
            <span className="inline-flex items-center gap-2 w-fit">
              <span className="w-2 h-2 bg-orange-500 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Menú digital para restaurantes</span>
            </span>

            <h1 className="font-black leading-[0.9] tracking-tighter" style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>
              Manda tu<br />
              menú,<br />
              <span className="text-orange-500">sin drama.</span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed max-w-sm">
              QR, pedidos en tiempo real y gestión completa. Para restaurantes que no quieren complicarse.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#registro"
                className="inline-flex items-center gap-3 bg-gray-950 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-full text-base transition-colors">
                Empezar gratis <ArrowRight size={18} />
              </a>
              <span className="text-xs text-gray-400">✓ 30 días gratis &nbsp;·&nbsp; ✓ Sin tarjeta</span>
            </div>
          </div>

          {/* Right: Product preview */}
          <div className="relative self-end">
            {/* Floating notification */}
            <div className="absolute -top-6 -left-6 z-10 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-gray-100">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <Zap size={15} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-950">Nuevo pedido</p>
                <p className="text-xs text-gray-400">Mesa 4 &nbsp;·&nbsp; $26.400</p>
              </div>
            </div>

            {/* QR badge */}
            <div className="absolute -right-3 top-10 z-10 bg-gray-950 rounded-2xl px-3 py-2.5 flex items-center gap-2">
              <QrCode size={14} strokeWidth={1.5} className="text-orange-500" />
              <span className="text-xs font-bold text-white">QR activo</span>
            </div>

            {/* App card */}
            <div className="bg-gray-950 rounded-t-3xl px-6 pt-8 pb-0 overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  <Image src="/logo.png" alt="MandaMenu" width={22} height={22} className="object-contain brightness-0 invert" />
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-tight">La Hamburguesería</p>
                  <p className="text-gray-400 text-xs">Abierto ahora · 14 productos</p>
                </div>
              </div>

              <div className="flex gap-2 mb-5">
                {['Todo', 'Burgers', 'Bebidas', 'Postres'].map((c, i) => (
                  <span key={c} className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {c}
                  </span>
                ))}
              </div>

              {[
                { emoji: '🍔', name: 'Smash Burger', desc: 'Doble carne, queso cheddar', price: '$12.900', hot: true },
                { emoji: '🍟', name: 'Papas rústicas', desc: 'Con salsa especial', price: '$7.500', hot: false },
                { emoji: '🥤', name: 'Limonada de coco', desc: 'Natural, 500 ml', price: '$6.000', hot: false },
              ].map(({ emoji, name, desc, price, hot }) => (
                <div key={name} className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-bold">{name}</p>
                        {hot && <span className="text-orange-400 text-xs font-semibold">Top</span>}
                      </div>
                      <p className="text-gray-500 text-xs">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-gray-200 text-sm font-black">{price}</p>
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-black leading-none" style={{ fontSize: '1.1rem' }}>+</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="py-5">
                <button className="w-full bg-orange-500 text-white font-black py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2">
                  <ShoppingBag size={15} strokeWidth={2} />
                  Ver pedido · $26.400
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* El problema */}
      <section className="bg-gray-950 text-white px-8 py-28">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-6">El problema</p>
            <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter">
              La carta de<br />
              papel ya<br />
              <span className="text-gray-500 line-through">no funciona.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-6">
            {[
              'Imprimir es caro y cuando cambias un precio, ya quedó viejo.',
              'Los pedidos se pierden entre el ruido, el papel y los malentendidos.',
              'Tu menú no se ve en Google. Nadie sabe qué vendes.',
              'Actualizar la carta depende de que alguien tenga tiempo.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 border-b border-gray-800 pb-6">
                <span className="text-orange-500 font-black text-lg shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-gray-300 text-base leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* La solución */}
      <section className="px-8 py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="md:sticky md:top-24">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-6">La solución</p>
            <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter max-w-lg">
              Todo lo que<br />
              necesita tu<br />
              <span className="text-orange-500">restaurante.</span>
            </h2>
          </div>
          <BenefitsSection />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-white px-8 py-28 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-6">Cómo funciona</p>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-20">
            Tres pasos.<br />Eso es todo.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { n: '1', title: 'Crea tu cuenta', desc: 'Regístrate en menos de 2 minutos. Sin tarjeta de crédito, sin tramitología.' },
              { n: '2', title: 'Sube tu menú', desc: 'Agrega tus productos a mano o déjale el trabajo a nuestra IA de importación.' },
              { n: '3', title: 'Comparte el QR', desc: 'Ponlo en tu mesa, vitrina o stories. Tus clientes ya pueden ver el menú y pedir.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col gap-4">
                <span className="text-8xl font-black text-gray-100 leading-none">{n}</span>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quién */}
      <section className="px-8 py-28 max-w-7xl mx-auto">
        <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-6">Para quién es</p>
        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-16">
          Hecho para los que<br />
          <span className="text-orange-500">mueven la gastronomía</span><br />
          desde abajo.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { emoji: '🚚', type: 'Food trucks', desc: 'Cambia el menú del día sin imprimir nada. Tus clientes siempre saben qué hay.' },
            { emoji: '👻', type: 'Cocinas ocultas', desc: 'Sin local físico pero con menú digital profesional. Pedidos claros, menos errores.' },
            { emoji: '🍽️', type: 'Restaurantes', desc: 'Desde un puesto en la plaza hasta varias sucursales. Escala sin complicarte.' },
          ].map(({ emoji, type, desc }) => (
            <div key={type} className="bg-[#EDEAE4] rounded-3xl p-8">
              <span className="text-4xl">{emoji}</span>
              <h3 className="font-black text-xl mt-4 mb-2">{type}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="bg-orange-500 px-8 py-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight">
              Desde $15 USD<br />al mes.
            </h2>
            <p className="text-orange-100 text-lg mt-4">30 días gratis para empezar. Sin compromisos.</p>
          </div>
          <a href="#registro"
            className="shrink-0 inline-flex items-center gap-3 bg-white text-orange-500 font-black px-10 py-5 rounded-full text-lg hover:bg-orange-50 transition-colors">
            Empezar gratis <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Registro */}
      <section id="registro" className="px-8 py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-6">Empieza hoy</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight mb-6">
              Tu primer menú<br />
              digital en<br />
              <span className="text-orange-500">minutos.</span>
            </h2>
            <ul className="flex flex-col gap-3 mt-8">
              {['30 días gratis sin tarjeta', 'Soporte en español', 'Cancela cuando quieras', 'Actualizaciones incluidas'].map(b => (
                <li key={b} className="flex items-center gap-3 text-gray-600">
                  <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-none stroke-white stroke-2">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
            <Suspense>
              <RegisterForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-8 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="MandaMenu" width={26} height={26} className="object-contain" />
            <span className="font-black text-sm">MandaMenu</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} MandaMenu — Todos los derechos reservados</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Privacidad
            </Link>
            <Link href="/login" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
