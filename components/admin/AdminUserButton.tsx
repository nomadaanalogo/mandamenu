'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Lock, Sparkles, X, Eye, EyeOff, Check, ArrowUpRight } from 'lucide-react'
import type { PlanLimits } from '@/lib/plans'

export default function AdminUserButton({ email, initials, plan }: { email: string; initials: string; plan: PlanLimits }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'main' | 'password'>('main')

  // Cambiar contraseña
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [pwLoading, setPwLoading]     = useState(false)
  const [pwError, setPwError]         = useState<string | null>(null)
  const [pwSuccess, setPwSuccess]     = useState(false)

  function closeModal() {
    setOpen(false)
    // reset
    setTimeout(() => {
      setTab('main')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwError(null); setPwSuccess(false)
    }, 200)
  }

  async function handleChangePassword() {
    setPwError(null)
    if (!newPw || newPw.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres'); return }
    if (newPw !== confirmPw)        { setPwError('Las contraseñas no coinciden'); return }

    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)

    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setTimeout(() => closeModal(), 1500)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Avatar botón */}
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold hover:bg-gray-700 transition-colors"
        title="Mi cuenta"
      >
        {initials}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="font-semibold text-gray-900 text-base">
                {tab === 'main' ? 'Mi cuenta' : 'Cambiar contraseña'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            {tab === 'main' && (
              <div className="px-5 pb-5 flex flex-col gap-4">
                {/* Usuario */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Administrador</p>
                  </div>
                </div>

                {/* Plan */}
                <div className="p-3 border border-gray-100 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">Plan {plan.planName}</span>
                    <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      plan.status === 'active' ? 'bg-green-50 text-green-600' :
                      plan.status === 'trial'  ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {plan.status === 'active' ? 'Activo' : plan.status === 'trial' ? 'Trial' : 'Inactivo'}
                    </span>
                  </div>
                  {plan.status === 'trial' && plan.trialEndsAt && (
                    <p className="text-xs text-gray-400 mb-2">
                      Vence el {new Date(plan.trialEndsAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
                    </p>
                  )}
                  <a href="/admin/upgrade"
                    onClick={closeModal}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    {plan.status === 'active' ? 'Cambiar plan' : 'Ver planes'} <ArrowUpRight size={11} />
                  </a>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setTab('password')}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  >
                    <Lock size={15} className="text-gray-400" />
                    Cambiar contraseña
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}

            {tab === 'password' && (
              <div className="px-5 pb-5 flex flex-col gap-3">
                {pwSuccess ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-green-600">
                    <Check size={32} strokeWidth={2.5} />
                    <p className="text-sm font-medium">Contraseña actualizada</p>
                  </div>
                ) : (
                  <>
                    {/* Nueva contraseña */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Nueva contraseña</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Confirmar contraseña</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Repetí la contraseña"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                      />
                    </div>

                    {pwError && <p className="text-xs text-red-500">{pwError}</p>}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setTab('main')}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Volver
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={pwLoading || !newPw || !confirmPw}
                        className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pwLoading ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
