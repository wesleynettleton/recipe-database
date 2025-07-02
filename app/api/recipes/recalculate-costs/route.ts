export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function POST() {
  try {
    const db = getDatabase();
    
    // Get all recipes
    const recipes = await db.getAllRecipes();
    
    let recalculatedCount = 0;
    let errorCount = 0;
    
    console.log(`Starting cost recalculation for ${recipes.length} recipes...`);
    
    for (const recipe of recipes) {
      try {
        // Check if recipe has ingredients
        if (!recipe.id) continue; // Skip if no ID
        
        const recipeWithIngredients = await db.getRecipeWithIngredients(recipe.id);
        
        if (recipeWithIngredients && recipeWithIngredients.ingredients && recipeWithIngredients.ingredients.length > 0) {
          // Recalculate the cost
          await db.recalculateRecipeCost(recipe.id);
          recalculatedCount++;
          console.log(`Recalculated costs for recipe: ${recipe.name} (ID: ${recipe.id})`);
        }
      } catch (error) {
        console.error(`Error recalculating cost for recipe ${recipe.name} (ID: ${recipe.id}):`, error);
        errorCount++;
      }
    }
    
    console.log(`Cost recalculation complete. Recalculated: ${recalculatedCount}, Errors: ${errorCount}`);
    
    return NextResponse.json({
      success: true,
      message: 'Cost recalculation completed',
      recalculatedCount,
      errorCount,
      totalRecipes: recipes.length
    });
  } catch (error) {
    console.error('Error during cost recalculation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate costs' },
      { status: 500 }
    );
  }
} 