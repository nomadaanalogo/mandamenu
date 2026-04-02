'use client'

import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Eliminar',
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string
  description?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
