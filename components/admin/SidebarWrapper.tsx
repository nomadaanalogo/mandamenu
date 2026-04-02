'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function SidebarWrapper({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop sidebar (siempre visible en md+) ── */}
      <div className="hidden md:flex">
        {sidebar}
      </div>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {/* Drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:hidden
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebar}
        {/* Botón cerrar dentro del drawer */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 bg-gray-50">
        {/* Barra superior mobile con hamburger */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-gray-700">Menú digital</span>
        </div>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
