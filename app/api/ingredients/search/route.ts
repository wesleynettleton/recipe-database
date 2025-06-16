import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchTerm = request.nextUrl.searchParams.get('q');
    const limit = request.nextUrl.searchParams.get('limit');

    if (!searchTerm) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
    }

    const database = getDatabase();
    const ingredients = await database.searchIngredients(searchTerm, parseInt(limit || '10'));

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error('Error searching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to search ingredients' },
      { status: 500 }
    );
  }
} 