export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '../../../../lib/database'
import { RecipeWithIngredients } from '../../../../lib/types'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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

    // Generate PDF using PDF-lib
    const pdfBuffer = await generatePDF(recipe)
    
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

async function generatePDF(recipe: RecipeWithIngredients): Promise<Buffer> {
  try {
    console.log('Creating PDF document...')
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    
    // Embed the standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Add a page
    let page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()
    
    // Set up margins and starting position
    const margin = 50
    let y = height - margin
    
    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, font: any) => {
      const words = text.split(' ')
      let line = ''
      let currentY = y
      
      for (const word of words) {
        const testLine = line + word + ' '
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)
        
        if (testWidth > maxWidth && line !== '') {
          page.drawText(line, { x, y: currentY, size: fontSize, font })
          line = word + ' '
          currentY -= fontSize + 2
        } else {
          line = testLine
        }
      }
      
      if (line) {
        page.drawText(line, { x, y: currentY, size: fontSize, font })
        currentY -= fontSize + 2
      }
      
      return currentY
    }
    
    // Title
    page.drawText(recipe.name, {
      x: margin,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0)
    })
    y -= 40
    
    // Recipe info
    const infoText = [
      `Recipe Code: ${recipe.code || 'N/A'}`,
      `Servings: ${recipe.servings}`,
      `Total Cost: £${recipe.totalCost?.toFixed(2) || '0.00'}`,
      `Cost per Serving: £${recipe.costPerServing?.toFixed(2) || '0.00'}`
    ]
    
    for (const info of infoText) {
      page.drawText(info, {
        x: margin,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      })
      y -= 20
    }
    
    y -= 20
    
    // Ingredients section
    page.drawText('Ingredients', {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0)
    })
    y -= 30

    // Table layout settings
    const colTitles = ['Code', 'Name', 'Quantity', 'Cost', 'Contains', 'May Contain']
    const colWidths = [60, 160, 80, 60, 100, 100]
    const colX = [margin]
    for (let i = 1; i < colWidths.length; i++) {
      colX[i] = colX[i - 1] + colWidths[i - 1]
    }
    const rowHeight = 18
    const headerBgColor = rgb(0.92, 0.92, 0.92)
    const borderColor = rgb(0.7, 0.7, 0.7)

    // Draw header background
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: colWidths.reduce((a, b) => a + b, 0),
      height: rowHeight + 4,
      color: headerBgColor,
      borderColor,
      borderWidth: 1
    })

    // Draw header text
    for (let i = 0; i < colTitles.length; i++) {
      page.drawText(colTitles[i], {
        x: colX[i] + 4,
        y: y + 4,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0)
      })
    }
    // Draw header bottom border
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: margin + colWidths.reduce((a, b) => a + b, 0), y: y },
      thickness: 1,
      color: borderColor
    })
    y -= rowHeight

    // Draw ingredients rows
    for (const ingredient of recipe.ingredients) {
      const containsAllergens: string[] = []
      const mayContainAllergens: string[] = []
      if (ingredient.ingredientAllergies) {
        try {
          const allergies = JSON.parse(ingredient.ingredientAllergies)
          if (Array.isArray(allergies)) {
            allergies.forEach((allergy) => {
              const allergen = typeof allergy === 'string' ? allergy.split(':')[0] : allergy.allergy
              const status = typeof allergy === 'string' ? allergy.split(':')[1] : allergy.status
              if (status === 'has') containsAllergens.push(allergen.charAt(0).toUpperCase() + allergen.slice(1))
              else if (status === 'may') mayContainAllergens.push(allergen.charAt(0).toUpperCase() + allergen.slice(1))
            })
          }
        } catch {}
      }
      const rowData = [
        ingredient.originalProductCode || 'N/A',
        ingredient.ingredientName || 'N/A',
        `${ingredient.quantity} ${ingredient.unit || 'unit'}`,
        `£${(ingredient.cost || 0).toFixed(2)}`,
        containsAllergens.join(', ') || 'None',
        mayContainAllergens.join(', ') || 'None'
      ]
      // Draw cell backgrounds (optional: comment out if not wanted)
      // page.drawRectangle({
      //   x: margin, y: y - 2, width: colWidths.reduce((a, b) => a + b, 0), height: rowHeight + 2, color: rgb(1,1,1)
      // })
      // Draw cell text
      for (let i = 0; i < rowData.length; i++) {
        let cellText = String(rowData[i])
        if (cellText.length > 28) cellText = cellText.slice(0, 25) + '...'
        page.drawText(cellText, {
          x: colX[i] + 4,
          y: y + 4,
          size: 9,
          font,
          color: rgb(0, 0, 0)
        })
      }
      // Draw row bottom border
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: margin + colWidths.reduce((a, b) => a + b, 0), y: y },
        thickness: 0.5,
        color: borderColor
      })
      // Draw column lines
      for (let i = 1; i < colX.length; i++) {
        page.drawLine({
          start: { x: colX[i], y: y + rowHeight },
          end: { x: colX[i], y: y },
          thickness: 0.5,
          color: borderColor
        })
      }
      y -= rowHeight
      // New page if needed
      if (y < margin + 100) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = height - margin
      }
    }
    
    y -= 30
    
    // Instructions section
    if (recipe.instructions) {
      page.drawText('Instructions', {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0)
      })
      y -= 30
      
      y = addWrappedText(recipe.instructions, margin, y, width - (2 * margin), 12, font)
      y -= 20
    }
    
    // Notes section
    if (recipe.notes) {
      page.drawText('Notes', {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0)
      })
      y -= 30
      
      y = addWrappedText(recipe.notes, margin, y, width - (2 * margin), 12, font)
      y -= 20
    }
    
    // Footer
    const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
    page.drawText(footerText, {
      x: margin,
      y: margin,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    })
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save()
    console.log('PDF generated successfully, size:', pdfBytes.length, 'bytes')
    
    return Buffer.from(pdfBytes)
    
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
} 