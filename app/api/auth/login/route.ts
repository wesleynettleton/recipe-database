import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminUsername || !adminPassword || !jwtSecret) {
      console.error('Authentication environment variables are not set.');
      return NextResponse.json(
        { success: false, message: 'Authentication not configured on the server.' },
        { status: 500 }
      );
    }

    if (username === adminUsername && password === adminPassword) {
      const secret = new TextEncoder().encode(jwtSecret);
      const token = await new SignJWT({ username, isAdmin: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h') // Token expires in 8 hours
        .sign(secret);

      const cookieStore = await cookies();
      cookieStore.set('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
      });

      return NextResponse.json({ success: true, message: 'Login successful' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}