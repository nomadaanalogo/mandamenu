import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, ClipboardList, Plus, ExternalLink, MapPin, Settings, BarChart2 } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user!.id)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis restaurantes</h1>
        <p className="text-sm text-gray-400 mt-1">Gestioná tus menús digitales</p>
      </div>

      {restaurants && restaurants.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            {restaurants.map((r) => (
              <div key={r.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">

                {/* Banner / header de la card */}
                <div className="h-2 w-full" style={{ backgroundColor: r.primary_color || '#e5e7eb' }} />

                <div className="p-5">
                  {/* Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                      {r.logo_url
                        ? <img src={r.logo_url} className="w-12 h-12 object-cover" alt={r.name} />
                        : <span className="text-xl">🍽️</span>}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-gray-900 truncate">{r.name}</h2>
                      <a href={`/${r.slug}`} target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                        {r.slug}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { href: `/admin/restaurants/${r.id}`,            icon: Settings,      label: 'Config.' },
                      { href: `/admin/restaurants/${r.id}/locations`, icon: MapPin,        label: 'Sedes' },
                      { href: `/admin/restaurants/${r.id}/menu`,      icon: BookOpen,      label: 'Menú' },
                      { href: `/admin/restaurants/${r.id}/orders`,    icon: ClipboardList, label: 'Pedidos' },
                      { href: `/admin/restaurants/${r.id}/ventas`,    icon: BarChart2,     label: 'Ventas' },
                    ].map(({ href, icon: Icon, label }) => (
                      <Link key={label} href={href}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <Icon size={17} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
                        <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Card para agregar nuevo */}
            <Link href="/admin/restaurants/new"
              className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 hover:border-gray-400 hover:bg-gray-50 transition-all min-h-40 group">
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Plus size={20} className="text-gray-400 group-hover:text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                Nuevo restaurante
              </span>
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mb-5">🍽️</div>
          <h2 className="font-bold text-lg text-gray-900 mb-1">Todavía no tenés restaurantes</h2>
          <p className="text-sm text-gray-400 mb-8">Creá tu primero y empezá a recibir pedidos digitales</p>
          <Link href="/admin/restaurants/new"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
            <Plus size={15} />
            Crear mi restaurante
          </Link>
        </div>
      )}
    </div>
  )
}
