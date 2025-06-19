import { Pool } from 'pg';
import { Ingredient, IngredientWithAllergies, Allergy, Recipe, RecipeIngredient, RecipeWithIngredients, Menu } from './types';

export class DatabaseConnection {
  private pool: Pool;

  constructor() {
    // Get the connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Validate connection string format
    try {
      const url = new URL(connectionString);
      if (!url.protocol || !url.hostname || !url.pathname) {
        throw new Error('Invalid DATABASE_URL format');
      }
      console.log('Database URL validation passed');
    } catch (error) {
      console.error('Database URL validation failed:', error);
      throw new Error(`Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false // Required for Neon
        }
      });
      console.log('Database pool created successfully');
    } catch (error) {
      console.error('Failed to create database pool:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to run queries
  private async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  // Get all ingredients
  async getAllIngredients(): Promise<Ingredient[]> {
    const result = await this.query('SELECT * FROM ingredients ORDER BY name');
    return result.rows;
  }

  // Get ingredient by product code
  async getIngredientByProductCode(productCode: string): Promise<IngredientWithAllergies | null> {
    const ingredientResult = await this.query('SELECT * FROM ingredients WHERE productcode = $1', [productCode]);
    const ingredient = ingredientResult.rows[0];

    if (!ingredient) {
      return null;
    }

    const allergiesResult = await this.query('SELECT allergy, status FROM allergies WHERE productcode = $1', [productCode]);
    const allergies = allergiesResult.rows.map(a => `${a.allergy}:${a.status}`);

    return {
      ...ingredient,
      allergies: allergies || [],
    };
  }

  // Insert ingredients
  async insertIngredients(ingredients: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ skipped: number, productCodesToUpdate: { productCode: string }[] }> {
    let skipped = 0;
    const productCodesToUpdate: { productCode: string }[] = [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const ing of ingredients) {
        if (!ing.productCode || !ing.name || ing.price == null) {
          skipped++;
          continue;
        }
        // Defensive: ensure price is a number
        const price = typeof ing.price === 'number' ? ing.price : parseFloat(String(ing.price));
        await client.query(`
          INSERT INTO ingredients (productcode, name, supplier, weight, unit, price)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT(productcode) DO UPDATE SET
            name = EXCLUDED.name,
            supplier = EXCLUDED.supplier,
            weight = EXCLUDED.weight,
            unit = EXCLUDED.unit,
            price = EXCLUDED.price,
            updated_at = CURRENT_TIMESTAMP
        `, [ing.productCode, ing.name, ing.supplier, ing.weight, ing.unit, price]);
        productCodesToUpdate.push({ productCode: ing.productCode });
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // After inserting ingredients, sync the snapshot data in recipe_ingredients
    if (productCodesToUpdate.length > 0) {
      await this.syncRecipeIngredientSnapshots(productCodesToUpdate);
    }

    return { skipped, productCodesToUpdate };
  }

  // Insert allergies
  async insertAllergies(allergies: Omit<Allergy, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const allergy of allergies) {
        // Check if the product exists
        const productExists = await this.query('SELECT id FROM ingredients WHERE productcode = $1', [allergy.productCode]);
        
        if (productExists.rows.length > 0) {
          await client.query(`
            INSERT INTO allergies (productcode, allergy, status)
            VALUES ($1, $2, $3)
            ON CONFLICT(productcode, allergy) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
          `, [allergy.productCode, allergy.allergy, allergy.status]);
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Get all recipes
  async getAllRecipes(): Promise<Recipe[]> {
    const result = await this.query('SELECT id, name, code, servings, totalcost, costperserving, created_at FROM recipes ORDER BY name');
    
    // Map the results to camelCase
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      servings: row.servings,
      totalCost: row.totalcost,
      costPerServing: row.costperserving,
      createdAt: row.created_at
    }));
  }

  // Create recipe
  async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await this.query(`
      INSERT INTO recipes (name, code, description, servings, preptime, cooktime, instructions, notes, photo, totalcost, costperserving)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      recipe.name,
      recipe.code,
      recipe.description,
      recipe.servings,
      recipe.prepTime,
      recipe.cookTime,
      recipe.instructions,
      recipe.notes,
      recipe.photo,
      recipe.totalCost,
      recipe.costPerServing
    ]);
    return result.rows[0].id;
  }

  // Add recipe ingredient
  async addRecipeIngredient(recipeIngredient: any): Promise<void> {
    console.log('addRecipeIngredient called with:', JSON.stringify(recipeIngredient, null, 2));
    console.log('recipeIngredient.originalProductCode:', recipeIngredient.originalProductCode);
    console.log('recipeIngredient.productCode:', recipeIngredient.productCode);
    console.log('All keys in recipeIngredient:', Object.keys(recipeIngredient));
    
    // Try to get the product code from either field
    const productCode = recipeIngredient.originalProductCode || recipeIngredient.productCode;
    
    if (!productCode) {
      console.error('Missing product code. Full ingredient data:', recipeIngredient);
      throw new Error("Ingredient is missing a product code.");
    }

    const ingredient = await this.getIngredientByProductCode(productCode);
    if (!ingredient) {
      throw new Error(`Ingredient with product code ${productCode} not found.`);
    }

    const snapshot = {
      ingredientName: ingredient.name,
      ingredientSupplier: ingredient.supplier,
      ingredientPrice: ingredient.price,
      ingredientWeight: ingredient.weight,
      ingredientUnit: ingredient.unit,
      ingredientAllergies: JSON.stringify(ingredient.allergies || [])
    };

    await this.query(`
      INSERT INTO recipe_ingredients (
        recipeId, originalProductCode, quantity, unit, notes, 
        ingredientName, ingredientSupplier, ingredientPrice, ingredientWeight, ingredientUnit, ingredientAllergies
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      recipeIngredient.recipeId,
      productCode, // Use the resolved product code
      recipeIngredient.quantity,
      recipeIngredient.unit,
      recipeIngredient.notes,
      snapshot.ingredientName,
      snapshot.ingredientSupplier,
      snapshot.ingredientPrice,
      snapshot.ingredientWeight,
      snapshot.ingredientUnit,
      snapshot.ingredientAllergies
    ]);
  }

  // Get recipe with ingredients
  async getRecipeWithIngredients(id: number): Promise<RecipeWithIngredients | null> {
    const recipeResult = await this.query('SELECT * FROM recipes WHERE id = $1', [id]);
    const recipe = recipeResult.rows[0];

    if (!recipe) return null;

    console.log('Recipe data from database (raw):', recipe);
    console.log('Recipe totalCost field:', recipe.totalcost);
    console.log('Recipe costPerServing field:', recipe.costperserving);

    const ingredientsResult = await this.query(`
      SELECT 
        ri.id,
        ri.quantity,
        ri.unit,
        ri.notes,
        ri.originalproductcode AS "originalProductCode",
        ri.ingredientname AS "ingredientName",
        ri.ingredientsupplier AS "ingredientSupplier",
        ri.ingredientprice AS "ingredientPrice",
        ri.ingredientweight AS "ingredientWeight",
        ri.ingredientunit AS "ingredientUnit",
        ri.ingredientallergies AS "ingredientAllergies"
      FROM recipe_ingredients ri
      WHERE ri.recipeId = $1
    `, [id]);

    // Calculate cost for each ingredient (using camelCase)
    const ingredientsWithCost = ingredientsResult.rows.map(ingredient => {
      const quantity = parseFloat(String(ingredient.quantity));
      const price = parseFloat(String(ingredient.ingredientPrice));
      const weight = parseFloat(String(ingredient.ingredientWeight));
      
      // Calculate price per unit (e.g., price per gram)
      const pricePerUnit = (weight && weight > 0) ? price / weight : price;
      
      // Calculate cost for the quantity used
      const cost = quantity * pricePerUnit;
      
      return {
        ...ingredient,
        cost: cost || 0
      };
    });

    // Calculate total cost and cost per serving
    const totalCost = ingredientsWithCost.reduce((sum, ingredient) => sum + (ingredient.cost || 0), 0);
    const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;

    console.log('Calculated costs:', {
      totalCost,
      costPerServing,
      servings: recipe.servings,
      ingredientsCount: ingredientsWithCost.length
    });

    const result = {
      id: recipe.id,
      name: recipe.name,
      code: recipe.code,
      servings: recipe.servings,
      instructions: recipe.instructions,
      notes: recipe.notes,
      photo: recipe.photo,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      totalCost: totalCost,
      costPerServing: costPerServing,
      ingredients: ingredientsWithCost.map(ing => ({
        ...ing,
        originalProductCode: ing.originalProductCode,
        ingredientName: ing.ingredientName,
        ingredientSupplier: ing.ingredientSupplier,
        ingredientPrice: ing.ingredientPrice,
        ingredientWeight: ing.ingredientWeight,
        ingredientUnit: ing.ingredientUnit,
        ingredientAllergies: ing.ingredientAllergies,
      }))
    };

    console.log('Final recipe data being returned:', {
      id: result.id,
      name: result.name,
      totalCost: result.totalCost,
      costPerServing: result.costPerServing,
      ingredientsCount: result.ingredients.length
    });

    return result;
  }

  // Save menu
  async saveMenu(name: string, date: string, weeklyMenu: any): Promise<void> {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const menuToSave: { [key: string]: any } = {
      name,
      week_start_date: date,
    };

    // Helper to get recipe ID or null
    const getRecipeId = (recipe: any) => recipe?.id || null;

    // Structure the data for each day's JSONB column
    for (const day of days) {
      const dayMenu = weeklyMenu[day];
      if (dayMenu) {
        menuToSave[day] = {
          lunchOption1: getRecipeId(dayMenu.lunchOption1),
          lunchOption2: getRecipeId(dayMenu.lunchOption2),
          lunchOption3: getRecipeId(dayMenu.lunchOption3),
          servedWith123: getRecipeId(dayMenu.servedWith123),
          dessertOptionD: getRecipeId(dayMenu.dessertOptionD),
        };
      } else {
        menuToSave[day] = null;
      }
    }

    // Structure the data for the daily_options JSONB column
    const dailyOptions = weeklyMenu.dailyOptions;
    if (dailyOptions) {
      menuToSave.daily_options = {
        option1: getRecipeId(dailyOptions.option1),
        option2: getRecipeId(dailyOptions.option2),
        option3: getRecipeId(dailyOptions.option3),
        option4: getRecipeId(dailyOptions.option4),
      };
    } else {
      menuToSave.daily_options = null;
    }

    // Use INSERT ... ON CONFLICT DO UPDATE to handle both new and existing menus
    await this.query(`
      INSERT INTO menus (
        name, week_start_date, 
        monday, tuesday, wednesday, thursday, friday, daily_options
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (week_start_date) DO UPDATE SET
        name = EXCLUDED.name,
        monday = EXCLUDED.monday,
        tuesday = EXCLUDED.tuesday,
        wednesday = EXCLUDED.wednesday,
        thursday = EXCLUDED.thursday,
        friday = EXCLUDED.friday,
        daily_options = EXCLUDED.daily_options,
        updated_at = CURRENT_TIMESTAMP;
    `, [
      menuToSave.name,
      menuToSave.week_start_date,
      JSON.stringify(menuToSave.monday),
      JSON.stringify(menuToSave.tuesday),
      JSON.stringify(menuToSave.wednesday),
      JSON.stringify(menuToSave.thursday),
      JSON.stringify(menuToSave.friday),
      JSON.stringify(menuToSave.daily_options),
    ]);
  }

  // Get menu for week
  async getMenuForWeek(date: string | null) {
    if (!date) return null;

    const result = await this.query('SELECT * FROM menus WHERE week_start_date = $1', [date]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Helper to fetch recipe details
    const getRecipeDetails = async (id: number | null): Promise<Recipe | null> => {
        if (!id) return null;
        const recipeResult = await this.query('SELECT id, name, code FROM recipes WHERE id = $1', [id]);
        return recipeResult.rows[0] || null;
    };
    
    // Helper to process a day's menu from JSON
    const processDay = async (dayData: any) => {
        if (!dayData) return null;
        return {
            lunchOption1: await getRecipeDetails(dayData.lunchOption1),
            lunchOption2: await getRecipeDetails(dayData.lunchOption2),
            lunchOption3: await getRecipeDetails(dayData.lunchOption3),
            servedWith123: await getRecipeDetails(dayData.servedWith123),
            dessertOptionD: await getRecipeDetails(dayData.dessertOptionD),
        };
    };

    // Helper to process daily options from JSON
    const processDailyOptions = async (optionsData: any) => {
        if (!optionsData) return null;
        return {
            option1: await getRecipeDetails(optionsData.option1),
            option2: await getRecipeDetails(optionsData.option2),
            option3: await getRecipeDetails(optionsData.option3),
            option4: await getRecipeDetails(optionsData.option4),
        };
    };

    // Map snake_case to camelCase and expand the JSONB columns
    const menu = {
      id: row.id,
      name: row.name,
      weekStartDate: row.week_start_date,
      monday: await processDay(row.monday),
      tuesday: await processDay(row.tuesday),
      wednesday: await processDay(row.wednesday),
      thursday: await processDay(row.thursday),
      friday: await processDay(row.friday),
      dailyOptions: await processDailyOptions(row.daily_options),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return {
        name: menu.name,
        weekStartDate: menu.weekStartDate,
        weeklyMenu: {
            monday: menu.monday,
            tuesday: menu.tuesday,
            wednesday: menu.wednesday,
            thursday: menu.thursday,
            friday: menu.friday,
            dailyOptions: menu.dailyOptions
        }
    };
  }

  // Sync recipe ingredient snapshots
  private async syncRecipeIngredientSnapshots(productCodesToUpdate: { productCode: string }[]) {
    if (productCodesToUpdate.length === 0) return;

    console.log('Syncing recipe ingredient snapshots for product codes:', productCodesToUpdate.map(p => p.productCode));

    // Get latest ingredient data
    const ingredientsResult = await this.query(
      'SELECT productcode, name, supplier, price, weight, unit FROM ingredients WHERE productcode = ANY($1)',
      [productCodesToUpdate.map(p => p.productCode)]
    );
    const ingredientsMap = new Map(ingredientsResult.rows.map(i => [i.productcode, i]));

    // Get latest allergy data
    const allergiesResult = await this.query(
      'SELECT productcode, allergy, status FROM allergies WHERE productcode = ANY($1)',
      [productCodesToUpdate.map(p => p.productCode)]
    );
    const ingredientAllergiesMap = new Map<string, string[]>();
    for (const allergy of allergiesResult.rows) {
      if (!ingredientAllergiesMap.has(allergy.productcode)) {
        ingredientAllergiesMap.set(allergy.productcode, []);
      }
      ingredientAllergiesMap.get(allergy.productcode)!.push(`${allergy.allergy}:${allergy.status}`);
    }

    // Update recipe ingredients that use these product codes
    const recipeIngredientsResult = await this.query(
      'SELECT id, originalproductcode FROM recipe_ingredients WHERE originalproductcode = ANY($1)',
      [productCodesToUpdate.map(p => p.productCode)]
    );

    for (const recIng of recipeIngredientsResult.rows) {
      const latestIngredient = ingredientsMap.get(recIng.originalproductcode);
      const latestAllergies = ingredientAllergiesMap.get(recIng.originalproductcode) || [];

      if (latestIngredient) {
        await this.query(`
          UPDATE recipe_ingredients
          SET 
            ingredientName = $1,
            ingredientSupplier = $2,
            ingredientPrice = $3,
            ingredientWeight = $4,
            ingredientUnit = $5,
            ingredientAllergies = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
        `, [
          latestIngredient.name,
          latestIngredient.supplier,
          latestIngredient.price,
          latestIngredient.weight,
          latestIngredient.unit,
          JSON.stringify(latestAllergies),
          recIng.id
        ]);
      }
    }

    // Get affected recipe IDs
    const recipeIdsResult = await this.query(
      'SELECT DISTINCT recipeId FROM recipe_ingredients WHERE id = ANY($1)',
      [recipeIngredientsResult.rows.map(ri => ri.id)]
    );

    // Recalculate costs for affected recipes
    for (const { recipeId } of recipeIdsResult.rows) {
      await this.recalculateRecipeCost(recipeId);
    }

    console.log('Recipe cost updated in database');
  }

  // Recalculate recipe cost
  async recalculateRecipeCost(recipeId: number) {
    console.log('Recalculating cost for recipe ID:', recipeId);
    
    // First, let's check what ingredients exist for this recipe
    const ingredientsCheck = await this.query(`
      SELECT quantity, ingredientPrice, ingredientWeight 
      FROM recipe_ingredients 
      WHERE recipeId = $1
    `, [recipeId]);
    
    console.log('Ingredients found for cost calculation:', ingredientsCheck.rows);
    
    const result = await this.query(`
      SELECT 
        SUM(quantity * (ingredientPrice / NULLIF(ingredientWeight, 0))) as totalCost,
        (SELECT servings FROM recipes WHERE id = $1) as servings
      FROM recipe_ingredients
      WHERE recipeId = $1
    `, [recipeId]);

    const { totalCost, servings } = result.rows[0];
    const costPerServing = servings ? totalCost / servings : 0;

    console.log('Cost calculation results:', {
      recipeId,
      totalCost,
      servings,
      costPerServing,
      rawResult: result.rows[0]
    });

    await this.query(`
      UPDATE recipes
      SET totalcost = $1, costperserving = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [totalCost || 0, costPerServing, recipeId]);

    console.log('Recipe cost updated in database');
  }

  // Get menu by week_start_date (for API compatibility)
  async getMenuByDate(menuDate: string): Promise<any | null> {
    const result = await this.query('SELECT * FROM menus WHERE week_start_date = $1', [menuDate]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];

    // Helper to fetch recipe details
    const getRecipeDetails = async (id: number | null): Promise<Recipe | null> => {
        if (!id) return null;
        const recipeResult = await this.query('SELECT id, name, code FROM recipes WHERE id = $1', [id]);
        return recipeResult.rows[0] || null;
    };
    
    // Helper to process a day's menu from JSON
    const processDay = async (dayData: any) => {
        if (!dayData) return null;
        // The data in the DB is already parsed if it's JSONB, but if it's a string, parse it.
        const data = typeof dayData === 'string' ? JSON.parse(dayData) : dayData;
        return {
            lunchOption1: await getRecipeDetails(data.lunchOption1),
            lunchOption2: await getRecipeDetails(data.lunchOption2),
            lunchOption3: await getRecipeDetails(data.lunchOption3),
            servedWith123: await getRecipeDetails(data.servedWith123),
            dessertOptionD: await getRecipeDetails(data.dessertOptionD),
        };
    };

    // Helper to process daily options from JSON
    const processDailyOptions = async (optionsData: any) => {
        if (!optionsData) return null;
        const data = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
        return {
            option1: await getRecipeDetails(data.option1),
            option2: await getRecipeDetails(data.option2),
            option3: await getRecipeDetails(data.option3),
            option4: await getRecipeDetails(data.option4),
        };
    };
    
    // Map snake_case to camelCase and expand the JSONB columns
    return {
      id: row.id,
      name: row.name,
      weekStartDate: row.week_start_date,
      monday: await processDay(row.monday),
      tuesday: await processDay(row.tuesday),
      wednesday: await processDay(row.wednesday),
      thursday: await processDay(row.thursday),
      friday: await processDay(row.friday),
      dailyOptions: await processDailyOptions(row.daily_options),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Delete menu by week_start_date (for API compatibility)
  async deleteMenuByDate(menuDate: string): Promise<boolean> {
    const result = await this.query('DELETE FROM menus WHERE week_start_date = $1', [menuDate]);
    return (result.rowCount ?? 0) > 0;
  }

  // Returns the number of unique allergy types in the allergies table
  async getAllergyTypesCount(): Promise<number> {
    const result = await this.query('SELECT COUNT(DISTINCT allergy) AS count FROM allergies');
    return result.rows[0]?.count || 0;
  }

  // Returns the number of ingredients in the ingredients table
  async getIngredientsCount(): Promise<number> {
    const result = await this.query('SELECT COUNT(*) AS count FROM ingredients');
    return result.rows[0]?.count || 0;
  }

  // Returns the number of menus in the menus table
  async getMenusCount(): Promise<number> {
    const result = await this.query('SELECT COUNT(*) AS count FROM menus');
    return result.rows[0]?.count || 0;
  }

  // Returns the number of recipes in the recipes table
  async getRecipesCount(): Promise<number> {
    const result = await this.query('SELECT COUNT(*) AS count FROM recipes');
    return result.rows[0]?.count || 0;
  }

  // Returns all ingredients with their allergies as an array of strings
  async getAllIngredientsWithAllergies(): Promise<any[]> {
    const ingredientsResult = await this.query('SELECT * FROM ingredients ORDER BY name');
    const ingredients = ingredientsResult.rows;

    // Get all allergies for all ingredients
    const allergiesResult = await this.query('SELECT productcode, allergy, status FROM allergies');
    const allergiesMap = new Map<string, string[]>();
    for (const row of allergiesResult.rows) {
      if (!allergiesMap.has(row.productcode)) {
        allergiesMap.set(row.productcode, []);
      }
      allergiesMap.get(row.productcode)!.push(`${row.allergy}:${row.status}`);
    }

    // Attach allergies to each ingredient
    return ingredients.map(ingredient => ({
      ...ingredient,
      productCode: ingredient.productcode, // Map to camelCase
      allergies: allergiesMap.get(ingredient.productcode) || [],
    }));
  }

  // Search ingredients by name (case-insensitive, partial match), with optional limit
  async searchIngredients(query: string, limit: number = 10): Promise<any[]> {
    const result = await this.query(
      'SELECT * FROM ingredients WHERE LOWER(name) LIKE $1 ORDER BY name LIMIT $2',
      [`%${query.toLowerCase()}%`, limit]
    );
    
    // Get allergies for the found ingredients
    if (result.rows.length > 0) {
      const productCodes = result.rows.map(ing => ing.productcode);
      const allergiesResult = await this.query(
        'SELECT productcode, allergy, status FROM allergies WHERE productcode = ANY($1)',
        [productCodes]
      );
      
      const allergiesMap = new Map<string, string[]>();
      for (const row of allergiesResult.rows) {
        if (!allergiesMap.has(row.productcode)) {
          allergiesMap.set(row.productcode, []);
        }
        allergiesMap.get(row.productcode)!.push(`${row.allergy}:${row.status}`);
      }

      // Attach allergies to each ingredient
      return result.rows.map(ingredient => ({
        ...ingredient,
        allergies: allergiesMap.get(ingredient.productcode) || [],
      }));
    }
    
    return result.rows;
  }

  // Returns all menus, ordered by week_start_date descending
  async getAllMenus(): Promise<any[]> {
    const result = await this.query('SELECT id, name, week_start_date FROM menus ORDER BY week_start_date DESC');
    // Map snake_case to camelCase
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      weekStartDate: row.week_start_date,
    }));
  }

  // Deletes a recipe by ID and returns true if a row was deleted
  async deleteRecipe(recipeId: number): Promise<boolean> {
    const result = await this.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Updates a recipe by ID with the provided fields. Returns true if a row was updated.
  async updateRecipe(recipeId: number, updates: Partial<Recipe>): Promise<boolean> {
    const fields = Object.keys(updates);
    if (fields.length === 0) return false;

    // Map camelCase field names to database column names
    const fieldMapping: { [key: string]: string } = {
      totalCost: 'totalcost',
      costPerServing: 'costperserving',
      prepTime: 'preptime',
      cookTime: 'cooktime',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    const setClause = fields.map((field, idx) => {
      const dbField = fieldMapping[field] || field;
      return `${dbField} = $${idx + 2}`;
    }).join(', ');
    
    const values = fields.map(field => (updates as any)[field]);
    const result = await this.query(
      `UPDATE recipes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [recipeId, ...values]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Replaces all ingredients for a recipe with the provided list. Returns true if successful.
  async updateRecipeIngredients(recipeId: number, ingredients: any[]): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Delete existing ingredients for the recipe
      await client.query('DELETE FROM recipe_ingredients WHERE recipeId = $1', [recipeId]);
      // Insert new ingredients
      for (const ing of ingredients) {
        await this.addRecipeIngredient({ ...ing, recipeId });
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Failed to update recipe ingredients:', e);
      return false;
    } finally {
      client.release();
    }
  }

  // Search recipes by name, code, or instructions (case-insensitive, partial match)
  async searchRecipes(query: string, limit: number = 20): Promise<any[]> {
    const result = await this.query(
      `SELECT * FROM recipes
       WHERE LOWER(name) LIKE $1
          OR LOWER(code) LIKE $1
          OR LOWER(instructions) LIKE $1
       ORDER BY name
       LIMIT $2`,
      [`%${query.toLowerCase()}%`, limit]
    );
    return result.rows;
  }

  // Clear all recipes and recipe ingredients
  async clearAllRecipes(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear recipe ingredients first (due to foreign key constraint)
      await client.query('DELETE FROM recipe_ingredients');
      
      // Clear recipes
      await client.query('DELETE FROM recipes');
      
      // Reset sequences
      await client.query('ALTER SEQUENCE recipes_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE recipe_ingredients_id_seq RESTART WITH 1');
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

let dbInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}

// Force redeploy by adding a new comment 