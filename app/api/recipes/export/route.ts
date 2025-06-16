import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../../lib/database'
import { RecipeWithIngredients } from '../../../../lib/types'
import path from 'path'
import fs from 'fs'
import puppeteer, { Browser } from 'puppeteer'

export async function GET(request: NextRequest) {
  try {
    // Check if PDF template exists
    const templatePath = path.join(process.cwd(), 'templates', 'pdf', 'recipe-template.html')
    
    if (!fs.existsSync(templatePath)) {
      console.error('PDF template file not found at:', templatePath)
      return NextResponse.json({ 
        error: 'PDF template file not found. Please ensure recipe-template.html exists in the templates/pdf folder.' 
      }, { status: 404 })
    }

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

    // Process recipe for PDF
    const htmlContent = await generatePDFHTML(recipe, db, templatePath)
    
    // Generate PDF using Puppeteer
    let browser: Browser | null = null;
    try {
      console.log('Launching Puppeteer browser...')
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        timeout: 10000 // 10 second timeout for browser launch
      })
      
      console.log('Browser launched, creating page...')
      const page = await browser.newPage()
      
      console.log('Setting page content...')
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 15000 // 15 second timeout for content loading
      })
      
      console.log('Generating PDF...')
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 20000 // 20 second timeout for PDF generation
      })
      
      console.log('PDF generated successfully')
      await browser.close()

      // Return PDF response
      const filename = `recipe-${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      
      return new NextResponse(pdfBuffer as Buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    } catch (puppeteerError) {
      console.error('Puppeteer error:', puppeteerError)
      if (browser) {
        try {
          await browser.close()
        } catch (closeError) {
          console.error('Error closing browser:', closeError)
        }
      }
      throw puppeteerError
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF export',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function generatePDFHTML(recipe: RecipeWithIngredients, db: any, templatePath: string): Promise<string> {
  console.log(`Processing single recipe: ${recipe.name} ID: ${recipe.id}`)
  
  // Debug: Log the recipe object properties
  console.log('Recipe object debug:', {
    id: recipe.id,
    name: recipe.name,
    code: recipe.code,
    servings: recipe.servings,
    instructions: recipe.instructions
  })
  
  console.log(`Found ${recipe.ingredients?.length || 0} ingredients for recipe: ${recipe.name}`)

  // Generate table rows for ingredients with separate allergen columns
  const ingredientRows = (recipe.ingredients || []).map((recipeIngredient: any) => {
    const containsAllergens: string[] = []
    const mayContainAllergens: string[] = []
    
    // Parse allergies from ingredientAllergies
    if (recipeIngredient.ingredientAllergies) {
      try {
        const allergies = JSON.parse(recipeIngredient.ingredientAllergies)
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

    // Generate contains allergen HTML
    let containsHTML = '<div class="allergen-info">'
    if (containsAllergens.length > 0) {
      containsHTML += `
        <div class="allergen-list">
          ${containsAllergens.map(allergen => `<span class="contains-badge">${allergen}</span>`).join('')}
        </div>
      `
    } else {
      containsHTML += '<div class="no-allergens">None declared</div>'
    }
    containsHTML += '</div>'

    // Generate may contain allergen HTML
    let mayContainHTML = '<div class="allergen-info">'
    if (mayContainAllergens.length > 0) {
      mayContainHTML += `
        <div class="allergen-list">
          ${mayContainAllergens.map(allergen => `<span class="may-contain-badge">${allergen}</span>`).join('')}
        </div>
      `
    } else {
      mayContainHTML += '<div class="no-allergens">None declared</div>'
    }
    mayContainHTML += '</div>'

    return `
      <tr>
        <td><div class="ingredient-code">${recipeIngredient.originalProductCode}</div></td>
        <td><div class="ingredient-name">${recipeIngredient.ingredientName}</div></td>
        <td>
          <div class="quantity-unit">
            <span class="quantity">${recipeIngredient.quantity}</span>
            <span class="unit">${recipeIngredient.unit || 'unit'}</span>
          </div>
        </td>
        <td>${containsHTML}</td>
        <td>${mayContainHTML}</td>
      </tr>
    `
  }).join('')

  // Read template file
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8')
  
  // Debug: Log the values being used for replacement
  console.log('Template replacement values:', {
    recipe_name: recipe.name || 'Untitled Recipe',
    recipe_code: recipe.code || 'N/A',
    portions: recipe.servings?.toString() || 'Not specified',
    generated_date: new Date().toLocaleDateString(),
    instructions: recipe.instructions || 'No instructions provided',
    recipe_photo: recipe.photo || ''
  })
  
  // Replace placeholders
  htmlTemplate = htmlTemplate.replace(/{{recipe_name}}/g, recipe.name || 'Untitled Recipe')
  htmlTemplate = htmlTemplate.replace(/{{recipe_code}}/g, recipe.code || 'N/A')
  htmlTemplate = htmlTemplate.replace(/{{portions}}/g, recipe.servings?.toString() || 'Not specified')
  htmlTemplate = htmlTemplate.replace(/{{generated_date}}/g, new Date().toLocaleDateString())
  htmlTemplate = htmlTemplate.replace(/{{ingredients_rows}}/g, ingredientRows)
  htmlTemplate = htmlTemplate.replace(/{{instructions}}/g, recipe.instructions || 'No instructions provided')
  
  // Handle recipe notes section
  let notesSection = ''
  if (recipe.notes && recipe.notes.trim() !== '') {
    notesSection = `
      <div class="section-title">Notes</div>
      <div class="instructions-container">
        <div class="instructions-text">${recipe.notes}</div>
      </div>
    `
  }
  htmlTemplate = htmlTemplate.replace(/{{notes_section}}/g, notesSection)
  
  // Handle logo image
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logos', 'Ideal-School-Meals.png')
  if (fs.existsSync(logoPath)) {
    try {
      const logoBuffer = fs.readFileSync(logoPath)
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
      htmlTemplate = htmlTemplate.replace(/{{logo_image}}/g, logoBase64)
      console.log(`Using logo: ${logoPath} (${logoBuffer.length} bytes)`)
    } catch (error) {
      console.error(`Error reading logo file: ${error}`)
      // Hide logo if error reading file
      htmlTemplate = htmlTemplate.replace(/{{logo_image}}/g, '')
      htmlTemplate = htmlTemplate.replace(
        /<div class="logo-section">[\s\S]*?<\/div>/g,
        '<div class="logo-section" style="display: none;"></div>'
      )
    }
  } else {
    // Hide logo if file doesn't exist
    htmlTemplate = htmlTemplate.replace(/{{logo_image}}/g, '')
    htmlTemplate = htmlTemplate.replace(
      /<div class="logo-section">[\s\S]*?<\/div>/g,
      '<div class="logo-section" style="display: none;"></div>'
    )
    console.log(`Logo file not found: ${logoPath}`)
  }
  
  // Handle recipe photo properly
  if (recipe.photo && recipe.photo.trim() !== '') {
    // Convert relative path to absolute file path for PDF generation
    const photoPath = path.join(process.cwd(), 'public', recipe.photo.startsWith('/') ? recipe.photo.substring(1) : recipe.photo)
    
    // Check if file exists
    if (fs.existsSync(photoPath)) {
      try {
        // Read the image file and convert to base64
        const imageBuffer = fs.readFileSync(photoPath)
        const imageExtension = path.extname(photoPath).toLowerCase()
        let mimeType = 'image/jpeg' // default
        
        // Determine MIME type based on file extension
        switch (imageExtension) {
          case '.png':
            mimeType = 'image/png'
            break
          case '.jpg':
          case '.jpeg':
            mimeType = 'image/jpeg'
            break
          case '.webp':
            mimeType = 'image/webp'
            break
          default:
            mimeType = 'image/jpeg'
        }
        
        // Convert to base64 data URL
        const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
        htmlTemplate = htmlTemplate.replace(/{{recipe_photo}}/g, base64Image)
        console.log(`Using photo (base64): ${photoPath} (${imageBuffer.length} bytes)`)
      } catch (error) {
        console.error(`Error reading photo file: ${error}`)
        // Hide photo if error reading file
        htmlTemplate = htmlTemplate.replace(/{{recipe_photo}}/g, '')
        htmlTemplate = htmlTemplate.replace(
          /<div class="recipe-photo">[\s\S]*?<\/div>/g,
          '<div class="recipe-photo" style="display: none;"></div>'
        )
      }
    } else {
      // Hide photo if file doesn't exist
      htmlTemplate = htmlTemplate.replace(/{{recipe_photo}}/g, '')
      htmlTemplate = htmlTemplate.replace(
        /<div class="recipe-photo">[\s\S]*?<\/div>/g,
        '<div class="recipe-photo" style="display: none;"></div>'
      )
      console.log(`Photo file not found: ${photoPath}`)
    }
  } else {
    // Hide photo section if no photo
    htmlTemplate = htmlTemplate.replace(/{{recipe_photo}}/g, '')
    htmlTemplate = htmlTemplate.replace(
      /<div class="recipe-photo">[\s\S]*?<\/div>/g,
      '<div class="recipe-photo" style="display: none;"></div>'
    )
    console.log('No photo provided for recipe')
  }

  return htmlTemplate
} 