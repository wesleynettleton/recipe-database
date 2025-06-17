import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFiles } from '../../../lib/excelParser';
import { getDatabase } from '../../../lib/database';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Excel upload process...');
    
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
    
    // Convert File to Buffer
    const ingredientsBuffer = Buffer.from(await ingredientsFile.arrayBuffer());
    const allergiesBuffer = Buffer.from(await allergiesFile.arrayBuffer());
    
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
    }

    console.log('Parsing Excel files...');
    
    // Parse Excel files
    const parseResult = parseExcelFiles(ingredientsBuffer, allergiesBuffer);
    
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
        await db.insertIngredients(batch);
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
        await db.insertAllergies(batch);
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
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 