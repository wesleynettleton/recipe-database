export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function POST(request: Request) {
  try {
    console.log('POST /api/recipes/duplicate called');
    
    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    console.log('Duplicating recipe with ID:', recipeId);
    const database = getDatabase();

    // Get the original recipe with all its ingredients
    const originalRecipe = await database.getRecipeWithIngredients(recipeId);
    
    if (!originalRecipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Create a new recipe name with "(Copy)" suffix
    const newRecipeName = `${originalRecipe.name} (Copy)`;
    
    // Create the duplicated recipe
    const newRecipeData = {
      name: newRecipeName,
      code: originalRecipe.code ? `${originalRecipe.code}_COPY` : undefined,
      description: undefined,
      servings: originalRecipe.servings,
      prepTime: undefined,
      cookTime: undefined,
      instructions: originalRecipe.instructions || undefined,
      notes: originalRecipe.notes || undefined,
      photo: originalRecipe.photo || undefined,
      totalCost: 0, // Will be recalculated after adding ingredients
      costPerServing: 0 // Will be recalculated after adding ingredients
    }

    console.log('Creating duplicated recipe with data:', newRecipeData);
    const newRecipeId = await database.createRecipe(newRecipeData);
    console.log('Duplicated recipe created with ID:', newRecipeId);

    // Copy all ingredients from the original recipe
    console.log('Copying ingredients to duplicated recipe...');
    for (const ingredient of originalRecipe.ingredients) {
      console.log('Copying ingredient:', ingredient.ingredientName);
      
      await database.addRecipeIngredient({
        recipeId: newRecipeId,
        originalProductCode: ingredient.originalProductCode,
        quantity: ingredient.quantity,
        unit: ingredient.unit || null,
        notes: ingredient.notes || null
      });
    }

    // Recalculate the recipe cost after adding all ingredients
    console.log('Recalculating duplicated recipe cost...');
    await database.recalculateRecipeCost(newRecipeId);
    console.log('Cost recalculation completed');

    console.log('Recipe duplicated successfully');
    return NextResponse.json({
      success: true,
      message: 'Recipe duplicated successfully',
      newRecipeId,
      newRecipeName
    })

  } catch (error) {
    console.error('Error duplicating recipe:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to duplicate recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
