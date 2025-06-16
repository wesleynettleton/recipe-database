import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the authToken cookie
    const cookieStore = await cookies();
    cookieStore.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 0, // More reliable for ensuring cookie deletion
      expires: new Date(0), // Set expiry to a past date
      path: '/',
    });

    return NextResponse.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}