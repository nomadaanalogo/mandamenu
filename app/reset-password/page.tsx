import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elegí una nueva contraseña para tu cuenta</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
