import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';
import { renderToStream, Document } from '@react-pdf/renderer';
import RecipePDF from '../../../../components/pdf/RecipePDF';
import { PassThrough } from 'stream';
import React from 'react';
import { RecipeWithIngredients } from '../../../../../lib/types';
import { format, parseISO } from 'date-fns';

const extractRecipesFromMenu = (menu: any): RecipeWithIngredients[] => {
    const recipesMap = new Map<number, RecipeWithIngredients>();

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    for (const day of days) {
        const dailyMenu = menu[day];
        if (dailyMenu) {
            for (const meal in dailyMenu) {
                const recipe = dailyMenu[meal];
                if (recipe && recipe.id) {
                    recipesMap.set(recipe.id, recipe);
                }
            }
        }
    }

    if (menu.dailyOptions) {
        for (const option in menu.dailyOptions) {
            const recipe = menu.dailyOptions[option];
            if (recipe && recipe.id) {
                recipesMap.set(recipe.id, recipe);
            }
        }
    }

    return Array.from(recipesMap.values());
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id: menuDate } = params;

    if (!menuDate) {
        return new NextResponse('Menu date is required', { status: 400 });
    }

    try {
        const db = getDatabase();
        const menu = await db.getMenuByDate(menuDate);

        if (!menu) {
            return new NextResponse('Menu not found', { status: 404 });
        }
        
        const recipeStubs = extractRecipesFromMenu(menu);
        
        if (recipeStubs.length === 0) {
            return new NextResponse('Menu has no recipes', { status: 404 });
        }
        
        const recipes = await Promise.all(
            recipeStubs
                .filter(stub => stub.id)
                .map(stub => db.getRecipeWithIngredients(stub.id!))
        );

        const validRecipes = recipes.filter((r): r is RecipeWithIngredients => r !== null);

        if (validRecipes.length === 0) {
            return new NextResponse('Could not load full recipe details for menu', { status: 404 });
        }

        const pdfStream = await renderToStream(
            <Document>
                {validRecipes.map((recipe, index) => (
                    <RecipePDF key={index} recipe={recipe} />
                ))}
            </Document>
        );

        const passthrough = new PassThrough();
        pdfStream.pipe(passthrough);

        const sanitizedMenuName = menu.name.replace(/[\/\\?%*:|"<>]/g, '-');
        const formattedDate = format(parseISO(menuDate), 'yyyy-MM-dd');
        const filename = `${sanitizedMenuName}_${formattedDate}.pdf`;

        return new NextResponse(passthrough as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Failed to generate menu PDF:', error);
        return new NextResponse('Failed to generate PDF', { status: 500 });
    }
} 