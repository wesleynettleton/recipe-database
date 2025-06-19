import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { PassThrough } from 'stream';
import React from 'react';
import RecipePDF from '../../../components/pdf/RecipePDF';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recipeId = searchParams.get('recipeId')

  if (!recipeId) {
    return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
  }

  try {
    const db = getDatabase();
    const recipe = await db.getRecipeWithIngredients(parseInt(recipeId, 10));
    
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Dynamically import @react-pdf/renderer
    const { renderToStream, Page, View, Text, Document, StyleSheet, Font, Image } = await import('@react-pdf/renderer');
    
    const pdfStream = await renderToStream(
        <RecipePDF 
            recipe={recipe} 
            components={{ Page, View, Text, Document, StyleSheet, Font, Image }}
        />
    );
    
    const passthrough = new PassThrough();
    pdfStream.pipe(passthrough);
    
    const sanitizedRecipeName = recipe.name.replace(/[\/\\?%*:|"<>]/g, '-');
    const filename = recipe.code 
      ? `${recipe.code} - ${sanitizedRecipeName}.pdf`
      : `${sanitizedRecipeName}.pdf`;
    
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