'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ClipboardList, Settings, MapPin, ExternalLink, ChevronLeft, BarChart2 } from 'lucide-react'

interface Restaurant {
  id: string; name: string; slug: string; logo_url: string | null
}

const NAV = [
  { label: 'Menú',       href: (id: string) => `/admin/restaurants/${id}/menu`,      icon: BookOpen },
  { label: 'Pedidos',    href: (id: string) => `/admin/restaurants/${id}/orders`,    icon: ClipboardList },
  { label: 'Configurar', href: (id: string) => `/admin/restaurants/${id}`,           icon: Settings },
  { label: 'Sedes',      href: (id: string) => `/admin/restaurants/${id}/locations`, icon: MapPin },
  { label: 'Ventas',     href: (id: string) => `/admin/restaurants/${id}/ventas`,    icon: BarChart2 },
]

export default function RestaurantSidebar({ restaurant }: { restaurant: Restaurant }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  function isActive(href: string) {
    if (href === `/admin/restaurants/${restaurant.id}`) return pathname === href
    return pathname.startsWith(href)
  }

  function navigate(href: string) {
    if (pathname === href) return
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Limpiar pending cuando la navegación termina
  if (!isPending && pendingHref) setPendingHref(null)

  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0 min-h-screen">
      {/* Volver */}
      <div className="px-4 pt-5 pb-3">
        <Link href="/admin"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5">
          <ChevronLeft size={13} />
          Mis restaurantes
        </Link>

        {/* Info restaurante */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt={restaurant.name} className="w-9 h-9 object-cover" />
              : <span className="text-base">🍽️</span>}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{restaurant.name}</p>
            <a href={`/${restaurant.slug}`} target="_blank"
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
              <span className="truncate">{restaurant.slug}</span>
              <ExternalLink size={9} className="shrink-0" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-gray-100 mb-2" />

      {/* Nav */}
      <nav className="px-3 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const to = href(restaurant.id)
          const active = isActive(to)
          const loading = pendingHref === to && isPending

          return (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {loading ? (
                <span className={`w-3.75 h-3.75 border-2 rounded-full animate-spin shrink-0 ${
                  active ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'
                }`} />
              ) : (
                <Icon size={15} className={active ? 'text-white' : 'text-gray-400'} />
              )}
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
