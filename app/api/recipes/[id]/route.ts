import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../../lib/database'

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const recipeId = parseInt(context.params.id)
    
    if (isNaN(recipeId)) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      )
    }

    const database = getDatabase()
    const recipe = await database.getRecipeWithIngredients(recipeId)

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    console.log('Recipe data from database:', JSON.stringify(recipe, null, 2))
    console.log('First ingredient:', recipe.ingredients?.[0])
    console.log('First ingredient allergies (raw):', recipe.ingredients?.[0]?.ingredientAllergies)
    console.log('First ingredient allergies (parsed):', JSON.parse(recipe.ingredients?.[0]?.ingredientAllergies || '[]'))
    console.log('Number of ingredients:', recipe.ingredients?.length || 0)
    console.log('First ingredient cost:', recipe.ingredients?.[0]?.cost)
    console.log('First ingredient quantity:', recipe.ingredients?.[0]?.quantity)
    console.log('First ingredient price:', recipe.ingredients?.[0]?.ingredientPrice)
    console.log('Recipe totalCost (raw):', recipe.totalCost)
    console.log('Recipe totalCost (type):', typeof recipe.totalCost)
    console.log('Recipe costPerServing (raw):', recipe.costPerServing)
    console.log('Recipe costPerServing (type):', typeof recipe.costPerServing)
    console.log('All recipe fields:', Object.keys(recipe))

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error(`Error fetching recipe ${context.params.id}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipeId = parseInt(params.id)
    
    if (isNaN(recipeId)) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      )
    }

    const database = getDatabase()
    
    // Check if recipe exists
    const recipe = await database.getRecipeWithIngredients(recipeId)
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const success = await database.deleteRecipe(recipeId)

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Recipe deleted successfully' 
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to delete recipe' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipeId = parseInt(params.id)
    
    if (isNaN(recipeId)) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      )
    }

    const { ingredients, name, code, servings, instructions, notes, photo, totalCost, costPerServing } = await request.json()
    
    const database = getDatabase()
    
    // Check if recipe exists
    const recipe = await database.getRecipeWithIngredients(recipeId)
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Calculate total cost if ingredients are provided
    let totalCostCalculated = 0
    let costPerServingCalculated = 0
    if (ingredients && ingredients.length > 0) {
      totalCostCalculated = ingredients.reduce((sum: number, ing: any) => sum + (ing.cost || 0), 0)
      costPerServingCalculated = servings > 0 ? totalCostCalculated / servings : 0
    }

    // Prepare DB update object
    const recipeUpdates = {
      name,
      code,
      servings,
      instructions,
      notes,
      photo,
      totalcost: totalCostCalculated,
      costperserving: costPerServingCalculated
    }

    // Update recipe basic info
    const recipeSuccess = await database.updateRecipe(recipeId, recipeUpdates)

    if (!recipeSuccess) {
      return NextResponse.json(
        { error: 'Failed to update recipe' },
        { status: 500 }
      )
    }

    // Update ingredients if provided
    if (ingredients) {
      const ingredientsSuccess = await database.updateRecipeIngredients(recipeId, ingredients)
      
      if (!ingredientsSuccess) {
        return NextResponse.json(
          { error: 'Failed to update recipe ingredients' },
          { status: 500 }
        )
      }
    }

    // Return the updated recipe
    const updatedRecipe = await database.getRecipeWithIngredients(recipeId)
    if (!updatedRecipe) {
      return NextResponse.json(
        { error: 'Failed to fetch updated recipe' },
        { status: 500 }
      )
    }
    const camelRecipe = {
      ...updatedRecipe,
      // totalCost and costPerServing are already camelCase in the returned object
      notes: updatedRecipe.notes,
      // ...other fields as needed
    }
    return NextResponse.json({ 
      success: true, 
      message: 'Recipe updated successfully',
      recipe: camelRecipe
    })

  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
} 