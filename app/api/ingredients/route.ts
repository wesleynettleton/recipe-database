import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const database = getDatabase();
    // This DB method now returns camelCase keys, so no extra mapping is needed here.
    const ingredients = await database.getAllIngredientsWithAllergies();
    
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 