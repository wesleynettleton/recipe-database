import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to the login page and authentication API routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check for the auth token in cookies
  const token = request.cookies.get('authToken')?.value;

  if (!token) {
    // If no token, redirect to the login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    await jwtVerify(token, getJwtSecret());
    // If token is valid, proceed
    return NextResponse.next();
  } catch (err) {
    // If token is invalid (e.g., expired, malformed), redirect to login
    console.log('JWT verification failed:', err);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  // Match all routes except for static files, fonts, and images
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|fonts/).*)',
  ],
}; 