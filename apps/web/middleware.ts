import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // Protect /portal routes (except login and recovery)
  if (pathname.startsWith('/portal')) {
    const isPublicPortalRoute =
      pathname === '/portal/login' || pathname.startsWith('/portal/recover');

    if (!isPublicPortalRoute && !refreshToken) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin routes (except admin login)
  if (pathname.startsWith('/admin')) {
    const isPublicAdminRoute = pathname === '/admin/login';

    if (!isPublicAdminRoute && !refreshToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};
