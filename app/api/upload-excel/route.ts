import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFiles } from '../../../lib/excelParser';
import { getDatabase } from '../../../lib/database';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Excel upload process...');
    
    // Log the request URL and headers for debugging
    console.log('Request URL:', request.url);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const formData = await request.formData();
    console.log('FormData received, checking files...');
    
    const ingredientsFile = formData.get('ingredients') as File;
    const allergiesFile = formData.get('allergies') as File;

    console.log('Ingredients file:', ingredientsFile ? {
      name: ingredientsFile.name,
      size: ingredientsFile.size,
      type: ingredientsFile.type
    } : 'null');
    
    console.log('Allergies file:', allergiesFile ? {
      name: allergiesFile.name,
      size: allergiesFile.size,
      type: allergiesFile.type
    } : 'null');

    if (!ingredientsFile || !allergiesFile) {
      console.log('Missing required files');
      return NextResponse.json({
        success: false,
        message: 'Both ingredients and allergies Excel files are required'
      }, { status: 400 });
    }

    // Check file sizes to prevent timeout (reduced for hobby plan)
    const maxSize = 5 * 1024 * 1024; // 5MB (reduced from 10MB)
    if (ingredientsFile.size > maxSize || allergiesFile.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: 'File size too large. Please use files smaller than 5MB each for faster processing.'
      }, { status: 400 });
    }

    // Validate file types
    if (!ingredientsFile.name.toLowerCase().endsWith('.xlsx') && 
        !ingredientsFile.name.toLowerCase().endsWith('.xls')) {
      return NextResponse.json({
        success: false,
        message: 'Ingredients file must be an Excel file (.xlsx or .xls)'
      }, { status: 400 });
    }

    if (!allergiesFile.name.toLowerCase().endsWith('.xlsx') && 
        !allergiesFile.name.toLowerCase().endsWith('.xls')) {
      return NextResponse.json({
        success: false,
        message: 'Allergies file must be an Excel file (.xlsx or .xls)'
      }, { status: 400 });
    }

    console.log('Converting files to buffers...');
    
    // Convert File to Buffer with error handling
    let ingredientsBuffer: Buffer;
    let allergiesBuffer: Buffer;
    
    try {
      ingredientsBuffer = Buffer.from(await ingredientsFile.arrayBuffer());
      console.log('Ingredients buffer created successfully, size:', ingredientsBuffer.length);
    } catch (error) {
      console.error('Error creating ingredients buffer:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to read ingredients file'
      }, { status: 400 });
    }
    
    try {
      allergiesBuffer = Buffer.from(await allergiesFile.arrayBuffer());
      console.log('Allergies buffer created successfully, size:', allergiesBuffer.length);
    } catch (error) {
      console.error('Error creating allergies buffer:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to read allergies file'
      }, { status: 400 });
    }
    
    console.log('Buffer sizes:', {
      ingredients: ingredientsBuffer.length,
      allergies: allergiesBuffer.length
    });

    // Debug: Check headers manually (simplified to reduce processing time)
    console.log('=== DEBUGGING INGREDIENTS FILE HEADERS ===');
    try {
      const workbook = XLSX.read(ingredientsBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('Sheet names:', workbook.SheetNames);
      console.log('Total rows in ingredients file:', jsonData.length);
      
      if (jsonData.length > 0) {
        console.log('Row 0 (headers):', jsonData[0]);
        if (jsonData.length > 1) console.log('Row 1:', jsonData[1]);
        if (jsonData.length > 2) console.log('Row 2:', jsonData[2]);
      }
    } catch (error) {
      console.error('Error reading ingredients file headers:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to read ingredients Excel file structure'
      }, { status: 400 });
    }

    console.log('=== DEBUGGING ALLERGIES FILE HEADERS ===');
    try {
      const workbook = XLSX.read(allergiesBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('Sheet names:', workbook.SheetNames);
      console.log('Total rows in allergies file:', jsonData.length);
      
      if (jsonData.length > 0) {
        console.log('Row 0 (headers):', jsonData[0]);
        if (jsonData.length > 1) console.log('Row 1:', jsonData[1]);
      }
    } catch (error) {
      console.error('Error reading allergies file headers:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to read allergies Excel file structure'
      }, { status: 400 });
    }

    console.log('Parsing Excel files...');
    
    // Parse Excel files with detailed error handling
    let parseResult;
    try {
      parseResult = parseExcelFiles(ingredientsBuffer, allergiesBuffer);
      console.log('Excel parsing completed successfully');
    } catch (error) {
      console.error('Error during Excel parsing:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to parse Excel files',
        details: error instanceof Error ? error.message : 'Unknown parsing error'
      }, { status: 400 });
    }
    
    console.log('Parse result:', {
      ingredientsCount: parseResult.ingredients.length,
      allergiesCount: parseResult.allergies.length,
      errors: parseResult.errors
    });

    if (parseResult.errors.length > 0) {
      console.log('Parsing errors found:', parseResult.errors);
      return NextResponse.json({
        success: false,
        message: 'Excel parsing failed',
        errors: parseResult.errors
      }, { status: 400 });
    }

    // Validate parsed data
    if (parseResult.ingredients.length === 0) {
      console.log('No ingredients found in file');
      return NextResponse.json({
        success: false,
        message: 'No valid ingredients found in the Excel file'
      }, { status: 400 });
    }

    // Validate individual ingredient data for pattern issues
    console.log('=== VALIDATING INGREDIENT DATA ===');
    for (let i = 0; i < Math.min(5, parseResult.ingredients.length); i++) {
      const ing = parseResult.ingredients[i];
      console.log(`Ingredient ${i + 1}:`, {
        productCode: ing.productCode,
        name: ing.name,
        supplier: ing.supplier,
        weight: ing.weight,
        unit: ing.unit,
        price: ing.price,
        priceType: typeof ing.price
      });
      
      // Check for potential pattern issues
      if (ing.productCode && typeof ing.productCode === 'string') {
        if (ing.productCode.includes(' ') || ing.productCode.includes('\n') || ing.productCode.includes('\t')) {
          console.warn(`Product code ${i + 1} contains whitespace: "${ing.productCode}"`);
        }
      }
      
      if (ing.name && typeof ing.name === 'string') {
        if (ing.name.length > 255) {
          console.warn(`Name ${i + 1} is too long: ${ing.name.length} characters`);
        }
      }
    }

    console.log('Storing in database...');
    
    // Store in database with progress logging (smaller batches for hobby plan)
    const db = getDatabase();
    
    if (parseResult.ingredients.length > 0) {
      console.log(`Inserting ${parseResult.ingredients.length} ingredients...`);
      
      // Process in smaller batches to work within 60s limit
      const batchSize = 50; // Reduced from 100
      for (let i = 0; i < parseResult.ingredients.length; i += batchSize) {
        const batch = parseResult.ingredients.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parseResult.ingredients.length/batchSize)}`);
        try {
          await db.insertIngredients(batch);
        } catch (error) {
          console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
          return NextResponse.json({
            success: false,
            message: 'Failed to insert ingredients into database',
            details: error instanceof Error ? error.message : 'Database insertion error'
          }, { status: 500 });
        }
      }
      console.log('Ingredients inserted successfully');
    }
    
    if (parseResult.allergies.length > 0) {
      console.log(`Inserting ${parseResult.allergies.length} allergies...`);
      
      // Process in smaller batches to work within 60s limit
      const batchSize = 50; // Reduced from 100
      for (let i = 0; i < parseResult.allergies.length; i += batchSize) {
        const batch = parseResult.allergies.slice(i, i + batchSize);
        console.log(`Processing allergy batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parseResult.allergies.length/batchSize)}`);
        try {
          await db.insertAllergies(batch);
        } catch (error) {
          console.error(`Error inserting allergy batch ${Math.floor(i/batchSize) + 1}:`, error);
          return NextResponse.json({
            success: false,
            message: 'Failed to insert allergies into database',
            details: error instanceof Error ? error.message : 'Database insertion error'
          }, { status: 500 });
        }
      }
      console.log('Allergies inserted successfully');
    }

    console.log('Upload completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Excel files processed successfully',
      ingredientsProcessed: parseResult.ingredients.length,
      allergiesProcessed: parseResult.allergies.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check if it's a pattern matching error
    if (error instanceof Error && error.message.includes('pattern')) {
      console.error('Pattern matching error detected:', error.message);
    }
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 