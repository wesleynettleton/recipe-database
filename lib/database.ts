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
    const result = await this.query('SELECT id, name, code, servings, totalCost, costPerServing, created_at as createdAt FROM recipes ORDER BY name');
    return result.rows;
  }

  // Create recipe
  async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await this.query(`
      INSERT INTO recipes (name, code, description, servings, prepTime, cookTime, instructions, notes, photo, totalCost, costPerServing)
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
      const cost = quantity * price;
      return {
        ...ingredient,
        cost: cost || 0
      };
    });

    return {
      ...recipe,
      ingredients: ingredientsWithCost
    };
  }

  // Save menu
  async saveMenu(name: string, date: string, weeklyMenu: any) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dailyOptions = weeklyMenu.dailyOptions || {};
      const dailyOption1 = dailyOptions.dailyOption1 ? dailyOptions.dailyOption1.id : null;
      const dailyOption2 = dailyOptions.dailyOption2 ? dailyOptions.dailyOption2.id : null;
      const dailyOption3 = dailyOptions.dailyOption3 ? dailyOptions.dailyOption3.id : null;
      const dailyOption4 = dailyOptions.dailyOption4 ? dailyOptions.dailyOption4.id : null;

      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
        const dayMenu = weeklyMenu[day];
        if (dayMenu) {
          await client.query(`
            INSERT INTO menus (
              name, week_start_date, day_of_week, 
              lunch_option_1, lunch_option_2, lunch_option_3, served_with_123, 
              dessert_option_d, daily_option_1, daily_option_2, daily_option_3, daily_option_4
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT(week_start_date, day_of_week) DO UPDATE SET
              name = EXCLUDED.name,
              lunch_option_1 = EXCLUDED.lunch_option_1,
              lunch_option_2 = EXCLUDED.lunch_option_2,
              lunch_option_3 = EXCLUDED.lunch_option_3,
              served_with_123 = EXCLUDED.served_with_123,
              dessert_option_d = EXCLUDED.dessert_option_d,
              daily_option_1 = EXCLUDED.daily_option_1,
              daily_option_2 = EXCLUDED.daily_option_2,
              daily_option_3 = EXCLUDED.daily_option_3,
              daily_option_4 = EXCLUDED.daily_option_4,
              updated_at = CURRENT_TIMESTAMP
          `, [
            name,
            date,
            day,
            dayMenu.lunchOption1?.id || null,
            dayMenu.lunchOption2?.id || null,
            dayMenu.lunchOption3?.id || null,
            dayMenu.servedWith123?.id || null,
            dayMenu.dessertOptionD?.id || null,
            dailyOption1,
            dailyOption2,
            dailyOption3,
            dailyOption4
          ]);
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

  // Get menu for week
  async getMenuForWeek(date: string | null) {
    if (!date) return null;

    const menuRows = await this.query('SELECT * FROM menus WHERE week_start_date = $1', [date]);
    if (menuRows.rows.length === 0) return null;

    const menu: any = {
      name: menuRows.rows[0].name,
      date: menuRows.rows[0].week_start_date,
      weeklyMenu: {
        monday: {},
        tuesday: {},
        wednesday: {},
        thursday: {},
        friday: {},
        dailyOptions: {},
      }
    };

    const dailyOptionsSet = new Set();

    for (const row of menuRows.rows) {
      const day = row.day_of_week.toLowerCase();
      
      const getRecipeDetails = async (id: number | null) => {
        if (!id) return null;
        const result = await this.query('SELECT id, name, code FROM recipes WHERE id = $1', [id]);
        return result.rows[0];
      };

      menu.weeklyMenu[day] = {
        lunchOption1: await getRecipeDetails(row.lunch_option_1),
        lunchOption2: await getRecipeDetails(row.lunch_option_2),
        lunchOption3: await getRecipeDetails(row.lunch_option_3),
        servedWith123: await getRecipeDetails(row.served_with_123),
        dessertOptionD: await getRecipeDetails(row.dessert_option_d),
      };

      if (!dailyOptionsSet.has(1)) {
        menu.weeklyMenu.dailyOptions.dailyOption1 = await getRecipeDetails(row.daily_option_1);
        dailyOptionsSet.add(1);
      }
      if (!dailyOptionsSet.has(2)) {
        menu.weeklyMenu.dailyOptions.dailyOption2 = await getRecipeDetails(row.daily_option_2);
        dailyOptionsSet.add(2);
      }
      if (!dailyOptionsSet.has(3)) {
        menu.weeklyMenu.dailyOptions.dailyOption3 = await getRecipeDetails(row.daily_option_3);
        dailyOptionsSet.add(3);
      }
      if (!dailyOptionsSet.has(4)) {
        menu.weeklyMenu.dailyOptions.dailyOption4 = await getRecipeDetails(row.daily_option_4);
        dailyOptionsSet.add(4);
      }
    }

    return menu;
  }

  // Sync recipe ingredient snapshots
  private async syncRecipeIngredientSnapshots(productCodesToUpdate: { productCode: string }[]) {
    if (productCodesToUpdate.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get latest ingredient data
      const ingredientsResult = await client.query(
        'SELECT productCode, name, supplier, price, weight, unit FROM ingredients WHERE productCode = ANY($1)',
        [productCodesToUpdate.map(p => p.productCode)]
      );
      
      const ingredientsMap = new Map(ingredientsResult.rows.map(i => [i.productCode, i]));

      // Get latest allergies
      const allergiesResult = await client.query(
        'SELECT productCode, allergy, status FROM allergies WHERE productCode = ANY($1)',
        [productCodesToUpdate.map(p => p.productCode)]
      );

      const ingredientAllergiesMap = new Map<string, string[]>();
      for (const allergy of allergiesResult.rows) {
        if (!ingredientAllergiesMap.has(allergy.productCode)) {
          ingredientAllergiesMap.set(allergy.productCode, []);
        }
        ingredientAllergiesMap.get(allergy.productCode)!.push(`${allergy.allergy}:${allergy.status}`);
      }

      // Get recipe ingredients to update
      const recipeIngredientsResult = await client.query(
        'SELECT id, originalProductCode FROM recipe_ingredients WHERE originalProductCode = ANY($1)',
        [productCodesToUpdate.map(p => p.productCode)]
      );

      // Update recipe ingredients
      for (const recIng of recipeIngredientsResult.rows) {
        const latestIngredient = ingredientsMap.get(recIng.originalProductCode);
        const latestAllergies = ingredientAllergiesMap.get(recIng.originalProductCode) || [];

        if (latestIngredient) {
          await client.query(`
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
      const recipeIdsResult = await client.query(
        'SELECT DISTINCT recipeId FROM recipe_ingredients WHERE id = ANY($1)',
        [recipeIngredientsResult.rows.map(ri => ri.id)]
      );

      // Recalculate costs for affected recipes
      for (const { recipeId } of recipeIdsResult.rows) {
        await this.recalculateRecipeCost(recipeId);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Recalculate recipe cost
  private async recalculateRecipeCost(recipeId: number) {
    const result = await this.query(`
      SELECT 
        SUM(quantity * ingredientPrice) as totalCost,
        (SELECT servings FROM recipes WHERE id = $1) as servings
      FROM recipe_ingredients
      WHERE recipeId = $1
    `, [recipeId]);

    const { totalCost, servings } = result.rows[0];
    const costPerServing = servings ? totalCost / servings : 0;

    await this.query(`
      UPDATE recipes
      SET totalCost = $1, costPerServing = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [totalCost || 0, costPerServing, recipeId]);
  }

  // Get menu by week_start_date (for API compatibility)
  async getMenuByDate(menuDate: string): Promise<any | null> {
    const result = await this.query('SELECT * FROM menus WHERE week_start_date = $1', [menuDate]);
    if (result.rows.length === 0) return null;
    return result.rows;
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
    const result = await this.query('SELECT * FROM menus ORDER BY week_start_date DESC');
    return result.rows;
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

    const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
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
}

let dbInstance: DatabaseConnection | null = null;

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
} 