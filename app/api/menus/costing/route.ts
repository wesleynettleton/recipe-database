export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get all menus
    const menus = await db.getAllMenus();
    
    // For each menu, get the detailed data with costs
    const menusWithCosts = [];
    
    for (const menu of menus) {
      const menuDetails = await db.getMenuByDate(menu.weekStartDate);
      
      if (!menuDetails) continue;
      
      let totalWeeklyCost = 0;
      let totalWeeklyServings = 0;
      const dailyCosts = [];
      
      // Process each day
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      for (const day of days) {
        const dayData = menuDetails[day];
        if (!dayData) continue;
        
        let dayCost = 0;
        let dayServings = 0;
        const dayItems = [];
        
        // Process main options
        if (dayData.lunchOption1) {
          const cost = dayData.lunchOption1.costPerServing || 0;
          dayCost += cost;
          dayServings = Math.max(dayServings, dayData.lunchOption1.servings || 0);
          dayItems.push({
            type: 'Main',
            name: dayData.lunchOption1.name,
            cost: cost,
            servings: dayData.lunchOption1.servings
          });
        }
        
        if (dayData.lunchOption2) {
          const cost = dayData.lunchOption2.costPerServing || 0;
          dayCost += cost;
          dayItems.push({
            type: 'Main',
            name: dayData.lunchOption2.name,
            cost: cost,
            servings: dayData.lunchOption2.servings
          });
        }
        
        if (dayData.lunchOption3) {
          const cost = dayData.lunchOption3.costPerServing || 0;
          dayCost += cost;
          dayItems.push({
            type: 'Main',
            name: dayData.lunchOption3.name,
            cost: cost,
            servings: dayData.lunchOption3.servings
          });
        }
        
        // Process sides
        if (dayData.servedWith123) {
          const cost = dayData.servedWith123.costPerServing || 0;
          dayCost += cost;
          dayItems.push({
            type: 'Side',
            name: dayData.servedWith123.name,
            cost: cost,
            servings: dayData.servedWith123.servings
          });
        }
        
        // Process dessert
        if (dayData.dessertOptionD) {
          const cost = dayData.dessertOptionD.costPerServing || 0;
          dayCost += cost;
          dayItems.push({
            type: 'Dessert',
            name: dayData.dessertOptionD.name,
            cost: cost,
            servings: dayData.dessertOptionD.servings
          });
        }
        
        // Process daily options
        if (dayData.dailyOptions) {
          if (dayData.dailyOptions.option1) {
            const cost = dayData.dailyOptions.option1.costPerServing || 0;
            dayCost += cost;
            dayItems.push({
              type: 'Daily Option',
              name: dayData.dailyOptions.option1.name,
              cost: cost,
              servings: dayData.dailyOptions.option1.servings
            });
          }
          
          if (dayData.dailyOptions.option2) {
            const cost = dayData.dailyOptions.option2.costPerServing || 0;
            dayCost += cost;
            dayItems.push({
              type: 'Daily Option',
              name: dayData.dailyOptions.option2.name,
              cost: cost,
              servings: dayData.dailyOptions.option2.servings
            });
          }
          
          if (dayData.dailyOptions.option3) {
            const cost = dayData.dailyOptions.option3.costPerServing || 0;
            dayCost += cost;
            dayItems.push({
              type: 'Daily Option',
              name: dayData.dailyOptions.option3.name,
              cost: cost,
              servings: dayData.dailyOptions.option3.servings
            });
          }
          
          if (dayData.dailyOptions.option4) {
            const cost = dayData.dailyOptions.option4.costPerServing || 0;
            dayCost += cost;
            dayItems.push({
              type: 'Daily Option',
              name: dayData.dailyOptions.option4.name,
              cost: cost,
              servings: dayData.dailyOptions.option4.servings
            });
          }
        }
        
        dailyCosts.push({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          cost: Math.round(dayCost * 100) / 100,
          items: dayItems,
          servings: dayServings
        });
        
        totalWeeklyCost += dayCost;
        totalWeeklyServings = Math.max(totalWeeklyServings, dayServings);
      }
      
      menusWithCosts.push({
        id: menu.id,
        name: menu.name,
        weekStartDate: menu.weekStartDate,
        totalWeeklyCost: Math.round(totalWeeklyCost * 100) / 100,
        totalWeeklyServings,
        costPerPerson: totalWeeklyServings > 0 ? Math.round((totalWeeklyCost / totalWeeklyServings) * 100) / 100 : 0,
        dailyCosts
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      menus: menusWithCosts 
    });
    
  } catch (error) {
    console.error('Error fetching menu costing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu costing' },
      { status: 500 }
    );
  }
}
