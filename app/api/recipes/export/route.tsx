import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { renderToStream } from '@react-pdf/renderer';
import RecipePDF from '../../../components/pdf/RecipePDF';
import { Document } from '@react-pdf/renderer';
import { PassThrough } from 'stream';
import React from 'react';

export async function POST(req: NextRequest) {
    try {
        const { recipe } = await req.json();

        if (!recipe) {
            return new NextResponse('Recipe data is required', { status: 400 });
        }

        const pdfStream = await renderToStream(
            <Document>
                <RecipePDF recipe={recipe} />
            </Document>
        );

        const passthrough = new PassThrough();
        pdfStream.pipe(passthrough);

        return new NextResponse(passthrough as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${recipe.name.replace(/ /g, '_')}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
} 