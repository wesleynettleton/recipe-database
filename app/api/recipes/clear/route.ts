import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function DELETE() {
  try {
    const database = getDatabase();
    
    // Clear recipe ingredients first (due to foreign key constraint)
    await database.query('DELETE FROM recipe_ingredients');
    
    // Clear recipes
    await database.query('DELETE FROM recipes');
    
    // Reset sequences
    await database.query('ALTER SEQUENCE recipes_id_seq RESTART WITH 1');
    await database.query('ALTER SEQUENCE recipe_ingredients_id_seq RESTART WITH 1');
    
    return NextResponse.json({ success: true, message: 'All recipes cleared successfully' });
  } catch (error) {
    console.error('Error clearing recipes:', error);
    return NextResponse.json(
      { error: 'Failed to clear recipes' },
      { status: 500 }
    );
  }
} 