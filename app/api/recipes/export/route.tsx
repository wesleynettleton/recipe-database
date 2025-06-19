import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { PassThrough } from 'stream';
import React from 'react';
import RecipePDF from '../../../components/pdf/RecipePDF';

// Dynamically import @react-pdf/renderer
const renderToStream = async (element: React.ReactElement): Promise<NodeJS.ReadableStream> => {
  const { renderToStream: renderer } = await import('@react-pdf/renderer');
  return renderer(element);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recipeId = searchParams.get('recipeId')

  if (!recipeId) {
    return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
  }

  try {
    const db = getDatabase();
    console.log(`Fetching recipe ${recipeId} for PDF export...`);
    const recipe = await db.getRecipeWithIngredients(parseInt(recipeId, 10));
    
    if (!recipe) {
      console.error(`Recipe with ID ${recipeId} not found.`);
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    console.log(`Recipe "${recipe.name}" found. Generating PDF...`);

    const pdfStream = await renderToStream(<RecipePDF recipe={recipe} />);
    
    const passthrough = new PassThrough();
    pdfStream.pipe(passthrough);
    
    const filename = `recipe-${recipe.code || recipe.name.replace(/ /g, '_')}.pdf`;
    
    return new NextResponse(passthrough as any, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });

  } catch (error) {
    console.error('Failed to generate recipe PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 