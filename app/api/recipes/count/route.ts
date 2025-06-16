import { getDatabase } from '../../../../lib/database';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDatabase();
    const count = db.getRecipesCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching recipe count:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch recipe count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 