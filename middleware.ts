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

  // Sin sesión → login
  if ((pathname.startsWith('/admin') || pathname.startsWith('/superadmin') || pathname.startsWith('/seller')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rutas /admin o /superadmin: hacer role + subscription en paralelo
  if (user && (pathname.startsWith('/admin') || pathname.startsWith('/superadmin'))) {
    const [{ data: userData }, { data: sub }] = await Promise.all([
      supabase.from('users').select('role').eq('id', user.id).single(),
      supabase.from('subscriptions').select('status, trial_ends_at').eq('owner_id', user.id).single(),
    ])

    const role = userData?.role

    // Superadmin: solo superadmins pueden entrar
    if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Seller intentando entrar al admin → redirigir a su panel
    if (pathname.startsWith('/admin') && role === 'seller') {
      return NextResponse.redirect(new URL('/seller', request.url))
    }

    // Trial expirado
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/upgrade')) {
      if (sub?.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
        return NextResponse.redirect(new URL('/admin/upgrade', request.url))
      }
    }
  }

  // Seller: verificar rol
  if (user && pathname.startsWith('/seller')) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'seller') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Login/register: redirigir si ya está autenticado
  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role === 'seller') return NextResponse.redirect(new URL('/seller', request.url))
    if (userData?.role === 'superadmin') return NextResponse.redirect(new URL('/superadmin', request.url))
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
