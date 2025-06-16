import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';
import XlsxPopulate from 'xlsx-populate';
import path from 'path';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCode = searchParams.get('includeCode') !== 'false'; // Default to true

    const menuDate = params.id;
    if (!menuDate) {
      return new NextResponse(JSON.stringify({ error: 'Invalid menu date' }), { status: 400 });
    }

    const db = getDatabase();
    const menu = db.getMenuByDate(menuDate);
    console.log('--- EXPORT ALLERGY FORM ---');
    console.log('Menu Date:', menuDate);
    console.log('Fetched Menu:', JSON.stringify(menu, null, 2));

    if (!menu) {
      console.log('Menu not found, exiting.');
      return new NextResponse(JSON.stringify({ error: 'Menu not found' }), { status: 404 });
    }

    // Load the workbook template
    const templatePath = path.resolve(process.cwd(), 'allergen-form-template.xlsx');
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet("Allergens");

    // Format the date
    const date = new Date(menu.date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    // Set the week range (e.g., in cell A1)
    sheet.cell("A1").value(`WEEK - ${formattedDate}`).style({
        fontSize: 24,
        bold: true,
        horizontalAlignment: "center"
    });
    sheet.cell("A3").value(menu.name);

    // Find the row number for each day header in the template
    const dayRowMapping: { [key: string]: number } = {};
    const usedRange = sheet.usedRange();
    if (usedRange) {
      usedRange.forEach((cell: any) => {
        const cellValue = cell.value();
        if (typeof cellValue === 'string') {
          const day = cellValue.trim().toLowerCase();
          if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)) {
            dayRowMapping[day] = cell.rowNumber();
          }
          if (day.includes('daily option')) { // Find "Daily Options" header
            dayRowMapping['dailyOptions'] = cell.rowNumber();
          }
        }
      });
    }

    // Define the mapping from allergy name to column number in the Excel sheet
    const allergenMapping: { [key: string]: number } = {
        'Celery': 2,
        'Cereals (Gluten)': 3,
        'Crustaceans': 4,
        'Eggs': 5,
        'Fish': 6,
        'Lupin': 7,
        'Milk': 8,
        'Molluscs': 9,
        'Mustard': 10,
        'Nuts': 11,
        'Peanuts': 12,
        'Sesame': 13,
        'Soya': 14,
        'Sulphur Dioxide': 15,
    };

    // Helper function to write a recipe and its allergies to a specific row
    const writeRecipeRow = async (partialRecipe: any, rowIndex: number) => {
        if (!partialRecipe || !partialRecipe.id) return;
        
        const recipe = await db.getRecipeWithIngredients(partialRecipe.id, true);
        if (!recipe) return;

        // Write recipe name and code to column A
        const recipeName = includeCode ? `${recipe.name} (${recipe.code})` : recipe.name;
        sheet.cell(`A${rowIndex}`).value(recipeName);

        // Get all unique allergies for the recipe, excluding 'may'
        const recipeAllergies = new Set(
          recipe.allergies
            .filter(a => a.endsWith(':has'))
            .map(a => a.split(':')[0])
        );
        
        // Place a checkmark in the correct column for each allergy
        for (const allergy of Array.from(recipeAllergies)) {
            const allergyName = allergy.charAt(0).toUpperCase() + allergy.slice(1);
            const mappedAllergyName = allergyName === 'Gluten' ? 'Cereals (Gluten)' : allergyName === 'Sulphites' ? 'Sulphur Dioxide' : allergyName;
            
            if (allergenMapping[mappedAllergyName]) {
                const col = allergenMapping[mappedAllergyName];
                sheet.cell(rowIndex, col).value("✓").style({
                    fontSize: 48,
                    horizontalAlignment: "center",
                    verticalAlignment: "center"
                });
            }
        }
    };
    
    // Process recipes for each day of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const day of days) {
        if (dayRowMapping[day] && menu.weeklyMenu[day]) {
            let currentRow = dayRowMapping[day] + 1; // Start writing on the row below the day header
            const recipesForDay = [
                menu.weeklyMenu[day].lunchOption1,
                menu.weeklyMenu[day].lunchOption2,
                menu.weeklyMenu[day].lunchOption3,
                menu.weeklyMenu[day].servedWith123,
                menu.weeklyMenu[day].dessertOptionD,
            ].filter(Boolean);

            for(const recipe of recipesForDay) {
                await writeRecipeRow(recipe, currentRow);
                currentRow++;
            }
        }
    }

    // Process recipes for the "Daily Options" section
    if (dayRowMapping.dailyOptions && menu.weeklyMenu.dailyOptions) {
        let currentRow = dayRowMapping.dailyOptions + 1; // Start below the "Daily Options" header
        const dailyRecipes = [
            menu.weeklyMenu.dailyOptions.option1,
            menu.weeklyMenu.dailyOptions.option2,
            menu.weeklyMenu.dailyOptions.option3,
            menu.weeklyMenu.dailyOptions.option4,
        ].filter(Boolean);
        
        for(const recipe of dailyRecipes) {
            await writeRecipeRow(recipe, currentRow);
            currentRow++;
        }
    }

    // Generate the file buffer
    const buffer = await workbook.outputAsync();
    console.log('--- EXPORT COMPLETE ---');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Allergy_Form_Menu_${menu.name}_${menu.date}.xlsx"`,
      },
    });

  } catch (error) {
    console.error('Error exporting allergy form:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to export allergy form' }), {
      status: 500,
    });
  }
} 