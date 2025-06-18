import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipeId = parseInt(params.id);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: 'Invalid recipe ID' }, { status: 400 });
    }

    const database = getDatabase();
    await database.recalculateRecipeCost(recipeId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Costs recalculated for recipe ${recipeId}` 
    });
  } catch (error) {
    console.error('Error recalculating recipe costs:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate recipe costs' },
      { status: 500 }
    );
  }
} 