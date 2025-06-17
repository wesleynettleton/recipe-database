import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFiles } from '../../../lib/excelParser';
import { getDatabase } from '../../../lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const ingredientsFile = formData.get('ingredients') as File;
    const allergiesFile = formData.get('allergies') as File;

    if (!ingredientsFile || !allergiesFile) {
      return NextResponse.json({
        success: false,
        message: 'Both ingredients and allergies Excel files are required'
      }, { status: 400 });
    }

    // Convert File to Buffer
    const ingredientsBuffer = Buffer.from(await ingredientsFile.arrayBuffer());
    const allergiesBuffer = Buffer.from(await allergiesFile.arrayBuffer());

    // Parse Excel files
    const parseResult = parseExcelFiles(ingredientsBuffer, allergiesBuffer);

    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Excel parsing failed',
        errors: parseResult.errors
      }, { status: 400 });
    }

    // Store in database
    const db = getDatabase();
    
    if (parseResult.ingredients.length > 0) {
      await db.insertIngredients(parseResult.ingredients);
    }
    
    if (parseResult.allergies.length > 0) {
      await db.insertAllergies(parseResult.allergies);
    }

    return NextResponse.json({
      success: true,
      message: 'Excel files processed successfully',
      ingredientsProcessed: parseResult.ingredients.length,
      allergiesProcessed: parseResult.allergies.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 