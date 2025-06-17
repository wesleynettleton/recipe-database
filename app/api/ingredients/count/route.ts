import { getDatabase } from '../../../../lib/database';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();
    const count = await db.getIngredientsCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching ingredient count:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch ingredient count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 