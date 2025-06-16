import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const db = getDatabase();
    const menuDate = context.params.id;
    
    if (!menuDate) {
      return NextResponse.json({ success: false, error: 'Menu date is required' }, { status: 400 });
    }

    const menu = await db.getMenuByDate(menuDate);

    if (menu) {
      return NextResponse.json({ success: true, menu });
    } else {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to fetch menu', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const db = getDatabase();
    const menuDate = context.params.id;
    if (!menuDate) {
      return NextResponse.json({ success: false, error: 'Menu date is required' }, { status: 400 });
    }
    const deleted = await db.deleteMenuByDate(menuDate);
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Menu deleted successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to delete menu', details: errorMessage }, { status: 500 });
  }
} 