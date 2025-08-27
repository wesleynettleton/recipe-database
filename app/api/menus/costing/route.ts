export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get all menus
    const menus = await db.getAllMenus();
    
    // For each menu, get the basic data
    const menusWithCosts = [];
    
    for (const menu of menus) {
      menusWithCosts.push({
        id: menu.id,
        name: menu.name,
        weekStartDate: menu.weekStartDate
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      menus: menusWithCosts 
    });
    
  } catch (error) {
    console.error('Error fetching menu costing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu costing' },
      { status: 500 }
    );
  }
}
