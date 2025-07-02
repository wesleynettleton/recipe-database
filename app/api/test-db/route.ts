import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const database = getDatabase();
    
    // Test basic connection
    const ingredientCount = await database.getIngredientsCount();
    
    // Get recipe data BEFORE recalculation
    const allRecipesBefore = await database.getAllRecipes();
    const testRecipeBefore = allRecipesBefore.find(r => r.id === 89);
    
    console.log('Recipe 89 BEFORE recalculation:', testRecipeBefore);
    
    // Manually trigger recalculation
    try {
      await database.recalculateRecipeCost(89);
      console.log('Recalculation completed for recipe 89');
    } catch (error) {
      console.error('Recalculation failed:', error);
    }
    
    // Get recipe data AFTER recalculation
    const allRecipesAfter = await database.getAllRecipes();
    const testRecipeAfter = allRecipesAfter.find(r => r.id === 89);
    
    console.log('Recipe 89 AFTER recalculation:', testRecipeAfter);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      ingredientCount: ingredientCount.toString(),
      before: testRecipeBefore,
      after: testRecipeAfter
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }
} 