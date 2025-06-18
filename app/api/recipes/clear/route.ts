import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function DELETE() {
  try {
    const database = getDatabase();
    
    await database.clearAllRecipes();
    
    return NextResponse.json({ success: true, message: 'All recipes cleared successfully' });
  } catch (error) {
    console.error('Error clearing recipes:', error);
    return NextResponse.json(
      { error: 'Failed to clear recipes' },
      { status: 500 }
    );
  }
} 