import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rutas protegidas — redirigir a login si no hay sesión
  if ((pathname.startsWith('/admin') || pathname.startsWith('/superadmin') || pathname.startsWith('/seller')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Superadmin: verificar rol
  if (pathname.startsWith('/superadmin') && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (userData?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Seller: verificar rol y redirigir si intenta entrar al admin
  if (pathname.startsWith('/admin') && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (userData?.role === 'seller') {
      return NextResponse.redirect(new URL('/seller', request.url))
    }
  }

  // Trial expirado: bloquear acceso al admin excepto /admin/upgrade
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/upgrade') && user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('owner_id', user.id)
      .single()

    if (sub?.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
      return NextResponse.redirect(new URL('/admin/upgrade', request.url))
    }
  }

  // Login/register: redirigir según rol si ya está autenticado
  if ((pathname === '/login' || pathname === '/register') && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (userData?.role === 'seller') {
      return NextResponse.redirect(new URL('/seller', request.url))
    }
    if (userData?.role === 'superadmin') {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    }
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
