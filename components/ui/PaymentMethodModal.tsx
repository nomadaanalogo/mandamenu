'use client'

export const PAYMENT_CONFIG: Record<string, { label: string; icon: string; bg: string; border: string; text: string }> = {
  cash:     { label: 'Efectivo',      icon: '💵', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700' },
  card:     { label: 'Tarjeta',       icon: '💳', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
  transfer: { label: 'Transferencia', icon: '🔄', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  pending:  { label: 'Paga después',  icon: '⏳', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700' },
}

export default function PaymentMethodModal({
  title,
  subtitle,
  includePending,
  onConfirm,
  onCancel,
}: {
  title: string
  subtitle: string
  includePending: boolean
  onConfirm: (method: string) => void
  onCancel: () => void
}) {
  const keys = includePending ? ['cash', 'card', 'transfer', 'pending'] : ['cash', 'card', 'transfer']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="font-bold text-base mb-1">{title}</p>
        <p className="text-sm text-gray-400 mb-5">{subtitle}</p>
        <div className={`grid gap-2 mb-4 ${includePending ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {keys.map(key => {
            const cfg = PAYMENT_CONFIG[key]
            return (
              <button key={key} onClick={() => onConfirm(key)}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 font-medium text-sm transition-all active:scale-95 hover:opacity-90 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <span className="text-2xl leading-none">{cfg.icon}</span>
                {cfg.label}
              </button>
            )
          })}
        </div>
        <button onClick={onCancel}
          className="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  )
}
