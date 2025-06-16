import { getDatabase } from '../../../../lib/database';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDatabase();
    const count = db.getMenusCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching menu count:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch menu count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 