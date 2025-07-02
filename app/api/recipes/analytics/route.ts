export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get all recipes with cost data
    const recipes = await db.getAllRecipes();
    
    // Filter out recipes without cost data
    const recipesWithCosts = recipes.filter(recipe => 
      recipe.costPerServing !== undefined && 
      recipe.costPerServing !== null && 
      recipe.costPerServing > 0
    );

    if (recipesWithCosts.length === 0) {
      return NextResponse.json({
        success: true,
        analytics: {
          totalRecipes: recipes.length,
          recipesWithCosts: 0,
          mostExpensive: null,
          leastExpensive: null,
          averageCost: 0,
          topExpensive: [],
          topCheapest: [],
          costDistribution: {
            under1: 0,
            between1and2: 0,
            between2and3: 0,
            over3: 0
          }
        }
      });
    }

    // Sort by cost per serving
    const sortedByCost = [...recipesWithCosts].sort((a, b) => 
      (b.costPerServing || 0) - (a.costPerServing || 0)
    );

    // Calculate analytics
    const totalCost = recipesWithCosts.reduce((sum, recipe) => sum + (recipe.costPerServing || 0), 0);
    const averageCost = totalCost / recipesWithCosts.length;

    // Get top 10 most expensive and cheapest
    const topExpensive = sortedByCost.slice(0, 10);
    const topCheapest = sortedByCost.slice(-10).reverse();

    // Calculate cost distribution
    const costDistribution = recipesWithCosts.reduce((dist, recipe) => {
      const cost = recipe.costPerServing || 0;
      if (cost < 1) dist.under1++;
      else if (cost >= 1 && cost < 2) dist.between1and2++;
      else if (cost >= 2 && cost < 3) dist.between2and3++;
      else dist.over3++;
      return dist;
    }, { under1: 0, between1and2: 0, between2and3: 0, over3: 0 });

    const analytics = {
      totalRecipes: recipes.length,
      recipesWithCosts: recipesWithCosts.length,
      mostExpensive: sortedByCost[0],
      leastExpensive: sortedByCost[sortedByCost.length - 1],
      averageCost: Math.round(averageCost * 100) / 100, // Round to 2 decimal places
      topExpensive,
      topCheapest,
      costDistribution
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching recipe analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 