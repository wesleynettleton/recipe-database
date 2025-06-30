export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    const menus = await db.getAllMenus();
    return NextResponse.json({ success: true, menus });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch menus' }, { status: 500 });
  }
} 