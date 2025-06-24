import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';
import { renderToStream, Document } from '@react-pdf/renderer';
import RecipePDF from '../../../../components/pdf/RecipePDF';
import { PassThrough } from 'stream';
import React from 'react';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: menuDate } = params;

    if (!menuDate) {
        return new NextResponse('Menu date is required', { status: 400 });
    }

    try {
        const db = getDatabase();
        const menu = await db.getMenuByDate(menuDate);

        if (!menu || !menu.recipes || menu.recipes.length === 0) {
            return new NextResponse('Menu not found or has no recipes', { status: 404 });
        }
        
        const pdfStream = await renderToStream(
            <Document>
                {menu.recipes.map((recipe: any, index: number) => (
                    <RecipePDF key={index} recipe={recipe} />
                ))}
            </Document>
        );

        const passthrough = new PassThrough();
        pdfStream.pipe(passthrough);

        return new NextResponse(passthrough as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="menu_${menuDate}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Failed to generate menu PDF:', error);
        return new NextResponse('Failed to generate PDF', { status: 500 });
    }
} 