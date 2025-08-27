export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get all recipes with cost data
    const recipes = await db.getAllRecipes();
    
    console.log('Raw recipes from database:', recipes.slice(0, 3)); // Log first 3 for debugging
    
    // Filter out recipes without cost data - be more lenient
    const recipesWithCosts = recipes.filter(recipe => {
      // Convert to number if it's a string
      const costPerServing = recipe.costPerServing ? Number(recipe.costPerServing) : 0;
      
      const hasCost = costPerServing !== null && 
                     costPerServing !== undefined && 
                     !isNaN(costPerServing) &&
                     costPerServing >= 0;
      
      if (!hasCost) {
        console.log(`Recipe "${recipe.name}" filtered out - costPerServing:`, recipe.costPerServing, 'converted:', costPerServing);
      } else {
        // Update the recipe object with the converted number
        recipe.costPerServing = costPerServing;
      }
      
      return hasCost;
    });

    console.log(`Found ${recipesWithCosts.length} recipes with cost data out of ${recipes.length} total`);

    if (recipesWithCosts.length === 0) {
      console.log('No recipes with cost data found');
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

    // Categorize recipes by type based on code
    const mains = recipesWithCosts.filter(recipe => recipe.code?.startsWith('M'));
    const sides = recipesWithCosts.filter(recipe => recipe.code?.startsWith('S'));
    const desserts = recipesWithCosts.filter(recipe => recipe.code?.startsWith('D'));

    // Sort each category by cost
    const sortedMains = [...mains].sort((a, b) => (b.costPerServing || 0) - (a.costPerServing || 0));
    const sortedSides = [...sides].sort((a, b) => (b.costPerServing || 0) - (a.costPerServing || 0));
    const sortedDesserts = [...desserts].sort((a, b) => (b.costPerServing || 0) - (a.costPerServing || 0));

    // Get top 10 most and least expensive for each category
    const topExpensiveMains = sortedMains.slice(0, 10);
    const topCheapestMains = sortedMains.slice(-10).reverse();
    const topExpensiveSides = sortedSides.slice(0, 10);
    const topCheapestSides = sortedSides.slice(-10).reverse();
    const topExpensiveDesserts = sortedDesserts.slice(0, 10);
    const topCheapestDesserts = sortedDesserts.slice(-10).reverse();

    // Overall top 10 (keeping for backward compatibility)
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
      // Overall lists
      topExpensive,
      topCheapest,
      // Categorized lists
      mains: {
        count: mains.length,
        topExpensive: topExpensiveMains,
        topCheapest: topCheapestMains
      },
      sides: {
        count: sides.length,
        topExpensive: topExpensiveSides,
        topCheapest: topCheapestSides
      },
      desserts: {
        count: desserts.length,
        topExpensive: topExpensiveDesserts,
        topCheapest: topCheapestDesserts
      },
      costDistribution
    };

    console.log('Analytics result:', {
      totalRecipes: analytics.totalRecipes,
      recipesWithCosts: analytics.recipesWithCosts,
      averageCost: analytics.averageCost
    });

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching recipe analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 