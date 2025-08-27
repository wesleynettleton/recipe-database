export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    
    // Get the menu by ID
    const menu = await db.getMenuById(parseInt(params.id));
    
    if (!menu) {
      return NextResponse.json(
        { success: false, error: 'Menu not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      menu 
    });
    
  } catch (error) {
    console.error('Error fetching menu costing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu costing' },
      { status: 500 }
    );
  }
}
