import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';
import { renderToStream, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import RecipePDF from '../../../../components/pdf/RecipePDF';
import { PassThrough } from 'stream';
import React from 'react';
import { RecipeWithIngredients } from '../../../../../lib/types';
import { format, parseISO } from 'date-fns';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const coverStyles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#000000',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 21,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 10,
        marginBottom: 16,
        color: '#4a4a4a',
    },
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    section: {
        marginBottom: 10,
        paddingBottom: 7,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    daySection: {
        width: '48%',
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 6,
        textTransform: 'capitalize',
        color: '#1a1a1a',
    },
    recipeRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    mealLabel: {
        width: '28%',
        fontFamily: 'Helvetica-Bold',
        color: '#4a4a4a',
    },
    recipeText: {
        width: '72%',
    },
    emptyText: {
        fontStyle: 'italic',
        color: '#777777',
    },
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 7,
        color: '#777777',
    },
});

const formatRecipe = (recipe: any) => {
    if (!recipe) return null;
    return recipe.code ? `${recipe.name} (${recipe.code})` : recipe.name;
};

const renderCoverRow = (label: string, recipe: any) => {
    const recipeText = formatRecipe(recipe);
    if (!recipeText) return null;

    return (
        <View key={label} style={coverStyles.recipeRow}>
            <Text style={coverStyles.mealLabel}>{label}</Text>
            <Text style={coverStyles.recipeText}>{recipeText}</Text>
        </View>
    );
};

const MenuCoverPage = ({ menu, menuDate }: { menu: any; menuDate: string }) => {
    const formattedDate = format(parseISO(menuDate), 'dd/MM/yyyy');

    return (
        <Page size="A4" style={coverStyles.page}>
            <Text style={coverStyles.title}>{menu.name}</Text>
            <Text style={coverStyles.subtitle}>Recipe Pack - Week commencing {formattedDate}</Text>

            <View style={coverStyles.dayGrid}>
                {DAYS.map(day => {
                    const dayData = menu[day];
                    const rows = dayData ? [
                        renderCoverRow('Lunch 1', dayData.lunchOption1),
                        renderCoverRow('Lunch 2', dayData.lunchOption2),
                        renderCoverRow('Lunch 3', dayData.lunchOption3),
                        renderCoverRow('Served With', dayData.servedWith123),
                        renderCoverRow('Baguette', dayData.baguetteOption),
                        renderCoverRow('Dessert', dayData.dessertOptionD),
                    ].filter(Boolean) : [];

                    return (
                        <View key={day} style={[coverStyles.section, coverStyles.daySection]}>
                            <Text style={coverStyles.sectionTitle}>{day}</Text>
                            {rows.length > 0 ? rows : <Text style={coverStyles.emptyText}>No recipes selected</Text>}
                        </View>
                    );
                })}
            </View>

            {menu.dailyOptions && (
                <View style={coverStyles.section}>
                    <Text style={coverStyles.sectionTitle}>Daily Options</Text>
                    {Array.from({ length: 10 }, (_, index) => {
                        const optionNumber = index + 1;
                        const key = `option${optionNumber}`;
                        return renderCoverRow(`Option ${optionNumber}`, menu.dailyOptions[key]);
                    }).filter(Boolean)}
                </View>
            )}

            <Text style={coverStyles.footer}>Generated on {new Date().toLocaleDateString()} with RecipeDB</Text>
        </Page>
    );
};

const extractRecipesFromMenu = (menu: any): RecipeWithIngredients[] => {
    const recipesMap = new Map<number, RecipeWithIngredients>();
    
    for (const day of DAYS) {
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
                <MenuCoverPage menu={menu} menuDate={menuDate} />
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