export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../lib/database'

export async function POST(request: NextRequest) {
  try {
    const { name, date, weeklyMenu } = await request.json()
    const db = getDatabase()

    const result = await db.saveMenu(name, date, weeklyMenu)

    return NextResponse.json({
      success: true,
      message: 'Menu saved successfully',
      menu: result
    })

  } catch (error) {
    console.error('Error saving menu:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { success: false, error: 'Failed to save menu', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const db = getDatabase()
    
    console.log('[API /api/menus] Requested date:', date)
    const menu = await db.getMenuForWeek(date)
    console.log('[API /api/menus] DB result:', menu)

    return NextResponse.json({
      success: true,
      menu
    })

  } catch (error) {
    console.error('Error fetching menus:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menus', details: errorMessage },
      { status: 500 }
    )
  }
} 