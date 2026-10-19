import { NextResponse, type NextRequest } from 'next/server';

// UX guard only: sends visitors without a session cookie to /login. The API verifies every request.
export function proxy(request: NextRequest) {
  const loggedIn = request.cookies.has('ka_token');
  const { pathname } = request.nextUrl;
  if (pathname === '/login') {
    return loggedIn ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }
  if (!loggedIn) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
