import * as XLSX from 'xlsx';
import { Ingredient, Allergy } from './types';

export interface ParsedExcelData {
  ingredients: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>[];
  allergies: Omit<Allergy, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
}

export function parseHoldsworthPricesExcel(buffer: Buffer): { 
  ingredients: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>[], 
  errors: string[],
  skipped: number
} {
  const errors: string[] = [];
  const ingredients: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let skipped = 0;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length < 3) {
      errors.push('Excel file appears to be empty or missing data rows');
      return { ingredients, errors, skipped };
    }

    // Headers are in row 0: ['Code', 'Product Name', 'Weight', 'Unit', 'Price']
    const headers = jsonData[0] as string[];
    console.log('Headers found:', headers);

    // Find column indices
    const codeIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('code'));
    const nameIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('product name'));
    const supplierIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('supplier'));
    const weightIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('weight'));
    const unitIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('unit'));
    const priceIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('price'));

    if (codeIndex === -1 || nameIndex === -1 || priceIndex === -1) {
      errors.push(`Missing required columns. Expected: Code, Product Name, Price. Found: ${headers.join(', ')}`);
      return { ingredients, errors, skipped };
    }

    // Process data rows starting from index 2 (skip header row 0 and empty row 1)
    for (let i = 2; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      if (!row || row.length === 0 || !row[codeIndex]) {
        skipped++;
        continue;
      }

      const productCode = String(row[codeIndex] || '').trim();
      const name = String(row[nameIndex] || '').trim();
      const supplier = supplierIndex !== -1 ? String(row[supplierIndex] || '').trim() : undefined;
      const weightValue = row[weightIndex];
      const unit = String(row[unitIndex] || '').trim();
      const priceValue = row[priceIndex];

      // Skip rows with missing essential data instead of treating as errors
      if (!productCode) {
        skipped++;
        continue;
      }

      if (!name) {
        skipped++;
        continue;
      }

      const price = parseFloat(String(priceValue));
      if (isNaN(price) || price < 0) {
        skipped++;
        continue;
      }

      // Parse weight (optional)
      const weight = weightValue ? parseFloat(String(weightValue)) : undefined;

      ingredients.push({
        productCode,
        name,
        supplier: supplier || undefined,
        weight: !isNaN(weight!) ? weight : undefined,
        unit: unit || undefined,
        price
      });
    }

    console.log(`Processed ${ingredients.length} ingredients, skipped ${skipped} rows with missing data`);

  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { ingredients, errors, skipped };
}

export function parseHoldsworthAllergiesExcel(buffer: Buffer): { 
  allergies: Omit<Allergy, 'id' | 'createdAt' | 'updatedAt'>[], 
  errors: string[],
  skipped: number
} {
  const errors: string[] = [];
  const allergies: Omit<Allergy, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let skipped = 0;

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length < 2) {
      errors.push('Excel file appears to be empty or missing data rows');
      return { allergies, errors, skipped };
    }

    // Headers: ['Code', 'Description', 'Celery', 'Gluten', 'Crustaceans', 'Milk', etc.]
    const headers = jsonData[0] as string[];
    console.log('Allergy headers found:', headers);

    const codeIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('code'));
    
    if (codeIndex === -1) {
      errors.push(`Missing required Code column. Found: ${headers.join(', ')}`);
      return { allergies, errors, skipped };
    }

    // Get allergy column indices (skip Code and Description columns)
    const allergyColumns: { name: string; index: number }[] = [];
    for (let i = 2; i < headers.length; i++) {
      if (headers[i] && headers[i].toString().trim()) {
        allergyColumns.push({
          name: headers[i].toString().trim(),
          index: i
        });
      }
    }

    // Process data rows starting from index 1
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      if (!row || row.length === 0 || !row[codeIndex]) {
        skipped++;
        continue;
      }

      const productCode = String(row[codeIndex] || '').trim();

      // Skip rows with missing product code instead of treating as error
      if (!productCode) {
        skipped++;
        continue;
      }

      // Check each allergy column
      for (const allergyCol of allergyColumns) {
        const allergyValue = String(row[allergyCol.index] || '').trim().toLowerCase();
        
        let status: 'has' | 'no' | 'may' | null = null;

        // Determine allergy status based on cell value
        if (allergyValue === 'y' || allergyValue === 'yes') {
          status = 'has';
        } else if (allergyValue === 'n' || allergyValue === 'no') {
          status = 'no';
        } else if (allergyValue === 'may' || allergyValue === 'may contain' || allergyValue === 'p') {
          status = 'may';
        }

        // Only create records for recognized values
        if (status) {
          allergies.push({
            productCode,
            allergy: allergyCol.name,
            status
          });
        }
      }
    }

    console.log(`Processed allergies for ${allergies.length} allergy records, skipped ${skipped} rows with missing data`);

  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { allergies, errors, skipped };
}

// Generic fallback parsers (keeping for compatibility)
export function parseIngredientsExcel(buffer: Buffer): { 
  ingredients: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>[], 
  errors: string[] 
} {
  // Try Holdsworth format first
  const result = parseHoldsworthPricesExcel(buffer);
  return { ingredients: result.ingredients, errors: result.errors };
}

export function parseAllergiesExcel(buffer: Buffer): { 
  allergies: Omit<Allergy, 'id' | 'createdAt' | 'updatedAt'>[], 
  errors: string[] 
} {
  // Try Holdsworth format first
  const result = parseHoldsworthAllergiesExcel(buffer);
  return { allergies: result.allergies, errors: result.errors };
}

export function parseExcelFiles(
  ingredientsBuffer: Buffer, 
  allergiesBuffer: Buffer
): ParsedExcelData {
  const ingredientsResult = parseHoldsworthPricesExcel(ingredientsBuffer);
  const allergiesResult = parseHoldsworthAllergiesExcel(allergiesBuffer);

  // Combine any serious errors, but don't include skipped row information as errors
  const errors = [...ingredientsResult.errors, ...allergiesResult.errors];
  
  // Add informational messages about skipped rows
  if (ingredientsResult.skipped > 0) {
    console.log(`Skipped ${ingredientsResult.skipped} ingredient rows with missing data`);
  }
  if (allergiesResult.skipped > 0) {
    console.log(`Skipped ${allergiesResult.skipped} allergy rows with missing data`);
  }

  return {
    ingredients: ingredientsResult.ingredients,
    allergies: allergiesResult.allergies,
    errors
  };
} 