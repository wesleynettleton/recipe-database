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
    } = await request.json()

    // Validate required fields
    if (!recipeName || !servings || selectedIngredients.length === 0) {
      return NextResponse.json(
        { error: 'Recipe name, servings, and at least one ingredient are required' },
        { status: 400 }
      )
    }

    const database = getDatabase()

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
      totalCost,
      costPerServing
    }

    const recipeId = await database.createRecipe(recipeData)

    // Add all ingredients to the recipe
    for (const ingredient of selectedIngredients) {
      await database.addRecipeIngredient({
        recipeId,
        originalProductCode: ingredient.originalProductCode,
        quantity: ingredient.quantity,
        unit: ingredient.unit || null,
        notes: ingredient.notes || null
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Recipe saved successfully',
      recipeId
    })

  } catch (error) {
    console.error('Error saving recipe:', error)
    return NextResponse.json(
      { error: 'Failed to save recipe' },
      { status: 500 }
    )
  }
} 