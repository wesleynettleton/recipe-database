export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../../lib/database'
import { RecipeWithIngredients } from '../../../../lib/types'
import puppeteer, { type Browser } from 'puppeteer';
import puppeteerCore, { type Browser as BrowserCore } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

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
    
    // Convert HTML to PDF using Puppeteer
    const pdfBuffer = await convertHTMLToPDF(htmlContent)
    
    console.log('PDF generated successfully')
    
    // Return PDF response
    const filename = `recipe-${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
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

async function convertHTMLToPDF(htmlContent: string): Promise<Buffer> {
  let browser: Browser | BrowserCore;
  
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.log('Running in production mode with @sparticuz/chromium')
      const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar')
      browser = await puppeteerCore.launch({
        executablePath,
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport
      });
    } else {
      console.log('Running in development mode with local Puppeteer')
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    
    // Set the HTML content directly
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '10px',
        bottom: '10px',
        left: '20px'
      }
    });

    await browser.close();
    
    console.log('PDF generated successfully, size:', pdf.length, 'bytes')
    return Buffer.from(pdf);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
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
    </style>
</head>
<body>
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