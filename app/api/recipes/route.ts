export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'

export async function GET(request: Request) {
  try {
    console.log('GET /api/recipes called')
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    console.log('Search query:', query)
    const db = getDatabase()

    let recipes
    if (query) {
      console.log('Searching recipes with query:', query)
      recipes = await db.searchRecipes(query)
    } else {
      console.log('Fetching all recipes')
      recipes = await db.getAllRecipes()
    }
    
    console.log('Found recipes:', recipes.length)
    return NextResponse.json({ success: true, recipes })
  } catch (error) {
    console.error('Failed to fetch recipes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/recipes called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      recipeName, 
      recipeCode, 
      servings, 
      instructions,
      recipeNotes, 
      photo,
      selectedIngredients, 
      totalCost, 
      costPerServing 
    } = body;

    console.log('Extracted data:', {
      recipeName,
      recipeCode,
      servings,
      instructions: instructions ? 'present' : 'missing',
      recipeNotes: recipeNotes ? 'present' : 'missing',
      photo: photo ? 'present' : 'missing',
      selectedIngredients: selectedIngredients?.length || 0,
      totalCost,
      costPerServing
    });

    // Validate required fields
    if (!recipeName || !servings || !selectedIngredients || selectedIngredients.length === 0) {
      console.log('Validation failed:', { recipeName, servings, ingredientsCount: selectedIngredients?.length });
      return NextResponse.json(
        { error: 'Recipe name, servings, and at least one ingredient are required' },
        { status: 400 }
      )
    }

    console.log('Validation passed, creating recipe...');
    const database = getDatabase();

    // Create the recipe using the existing database method
    const recipeData = {
      name: recipeName,
      code: recipeCode || undefined,
      description: undefined, // We removed description field, keeping undefined for compatibility
      servings,
      prepTime: undefined, // We removed prep time, keeping undefined for compatibility
      cookTime: undefined, // We removed cook time, keeping undefined for compatibility
      instructions: instructions || undefined,
      notes: recipeNotes || undefined,
      photo: photo || undefined,
      totalCost: totalCost || 0,
      costPerServing: costPerServing || 0
    }

    console.log('Creating recipe with data:', recipeData);
    const recipeId = await database.createRecipe(recipeData);
    console.log('Recipe created with ID:', recipeId);

    // Add all ingredients to the recipe
    console.log('Adding ingredients to recipe...');
    for (const ingredient of selectedIngredients) {
      console.log('Adding ingredient:', ingredient);
      console.log('Ingredient originalProductCode:', ingredient.originalProductCode);
      console.log('Ingredient productCode:', ingredient.productCode);
      console.log('Ingredient quantity:', ingredient.quantity);
      
      if (!ingredient.originalProductCode) {
        console.error('Missing originalProductCode for ingredient:', ingredient);
        throw new Error(`Ingredient is missing originalProductCode: ${JSON.stringify(ingredient)}`);
      }
      
      await database.addRecipeIngredient({
        recipeId,
        originalProductCode: ingredient.originalProductCode,
        quantity: ingredient.quantity,
        unit: ingredient.unit || null,
        notes: ingredient.notes || null
      });
    }

    console.log('Recipe saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Recipe saved successfully',
      recipeId
    })

  } catch (error) {
    console.error('Error saving recipe:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : 'No cause'
    });
    return NextResponse.json(
      { error: 'Failed to save recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 