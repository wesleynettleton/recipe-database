export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../../lib/database'
import { RecipeWithIngredients } from '../../../../lib/types'

export async function GET(request: NextRequest) {
  try {
    // Get recipeId from query parameters for single recipe export
    const { searchParams } = new URL(request.url)
    const recipeId = searchParams.get('recipeId')
    
    console.log('PDF Export request for recipeId:', recipeId)

    const db = getDatabase()

    let recipe: RecipeWithIngredients | null = null
    
    if (recipeId) {
      console.log('Fetching single recipe with ID:', recipeId)
      // Export single recipe
      recipe = await db.getRecipeWithIngredients(parseInt(recipeId))
    }

    console.log(`Found recipes: ${recipe ? 1 : 0}`)
    console.log(`Processing ${recipe ? 1 : 0} recipe(s) for PDF export`)

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Generate HTML content for the recipe
    const htmlContent = generatePDFHTML(recipe)
    
    // Return HTML that can be converted to PDF by the browser
    const filename = `recipe-${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.html`
    
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': htmlContent.length.toString(),
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF export',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function generatePDFHTML(recipe: RecipeWithIngredients): string {
  const ingredientRows = (recipe.ingredients || []).map((ingredient: any) => {
    const containsAllergens: string[] = []
    const mayContainAllergens: string[] = []
    
    // Parse allergies from ingredientAllergies
    if (ingredient.ingredientAllergies) {
      try {
        const allergies = JSON.parse(ingredient.ingredientAllergies)
        if (Array.isArray(allergies)) {
          allergies.forEach((allergy: any) => {
            const allergen = typeof allergy === 'string' ? allergy.split(':')[0] : allergy.allergy
            const status = typeof allergy === 'string' ? allergy.split(':')[1] : allergy.status
            
            if (status === 'has') {
              containsAllergens.push(allergen.charAt(0).toUpperCase() + allergen.slice(1))
            } else if (status === 'may') {
              mayContainAllergens.push(allergen.charAt(0).toUpperCase() + allergen.slice(1))
            }
          })
        }
      } catch (error) {
        console.error('Error parsing allergies:', error)
      }
    }

    return `
      <tr>
        <td>${ingredient.originalProductCode}</td>
        <td>${ingredient.ingredientName}</td>
        <td>${ingredient.quantity} ${ingredient.unit || 'unit'}</td>
        <td>£${(ingredient.cost || 0).toFixed(2)}</td>
        <td>${containsAllergens.join(', ') || 'None'}</td>
        <td>${mayContainAllergens.join(', ') || 'None'}</td>
      </tr>
    `
  }).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${recipe.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .recipe-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .recipe-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .info-item {
            text-align: center;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .info-value {
            font-size: 18px;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .instructions {
            white-space: pre-wrap;
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
        }
        .notes {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
        }
        .print-instructions {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        @media print {
            .print-instructions { display: none; }
        }
    </style>
</head>
<body>
    <div class="print-instructions">
        <strong>To save as PDF:</strong><br>
        1. Press Ctrl+P (or Cmd+P on Mac)<br>
        2. Select "Save as PDF" as destination<br>
        3. Click Save
    </div>

    <div class="header">
        <div class="recipe-title">${recipe.name}</div>
        <div class="recipe-info">
            <div class="info-item">
                <div class="info-label">Recipe Code</div>
                <div class="info-value">${recipe.code || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Servings</div>
                <div class="info-value">${recipe.servings}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total Cost</div>
                <div class="info-value">£${recipe.totalCost?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Cost per Serving</div>
                <div class="info-value">£${recipe.costPerServing?.toFixed(2) || '0.00'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Ingredients</div>
        <table>
            <thead>
                <tr>
                    <th>Product Code</th>
                    <th>Ingredient Name</th>
                    <th>Quantity</th>
                    <th>Cost</th>
                    <th>Contains Allergens</th>
                    <th>May Contain Allergens</th>
                </tr>
            </thead>
            <tbody>
                ${ingredientRows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Instructions</div>
        <div class="instructions">${recipe.instructions || 'No instructions provided'}</div>
    </div>

    ${recipe.notes ? `
    <div class="section">
        <div class="section-title">Notes</div>
        <div class="notes">${recipe.notes}</div>
    </div>
    ` : ''}

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    </div>
</body>
</html>
  `

  return html
} 