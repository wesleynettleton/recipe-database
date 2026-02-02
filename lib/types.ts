export interface Ingredient {
  id?: number;
  productCode: string;
  name: string;
  supplier?: string;
  weight?: number;
  unit?: string;
  price: number;
  // Grams of sugar per 100g of product (blank in Excel is treated as 0)
  sugarPer100g?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AllergyStatus = 'has' | 'no' | 'may';

export interface Allergy {
  id?: number;
  productCode: string;
  allergy: string;
  status: AllergyStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface IngredientWithAllergies extends Ingredient {
  allergies: string[];
}

export interface Recipe {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  servings: number;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  instructions?: string;
  notes?: string;
  photo?: string;
  totalCost?: number;
  costPerServing?: number;
  // Derived nutritional fields (not stored in DB yet)
  totalSugar?: number;        // total grams of sugar in the whole recipe
  sugarPerServing?: number;   // grams of sugar per serving
  createdAt?: string;
  updatedAt?: string;
  ingredients?: any[];
}

export interface RecipeIngredient {
  id?: number;
  recipeId: number;
  productCode?: string;
  originalProductCode?: string;
  quantity: number;
  unit?: string;
  notes?: string;
  cost?: number;
  ingredientName?: string;
  ingredientSupplier?: string;
  ingredientPrice?: number;
  ingredientWeight?: number;
  ingredientUnit?: string;
  ingredientAllergies?: string;
  // Snapshot nutritional info
  sugarPer100g?: number;  // sugar per 100g for this ingredient at time of use
  sugar?: number;         // grams of sugar contributed by this ingredient in the recipe
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: (RecipeIngredient & {
    cost: number;
  })[];
  allergies?: string[];
}

export interface UploadResult {
  success: boolean;
  message: string;
  ingredientsProcessed?: number;
  allergiesProcessed?: number;
  errors?: string[];
}

export interface Menu {
  id?: number;
  name: string;
  date: string;
  weeklyMenu: WeeklyMenu;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklyMenu {
  [day: string]: Recipe[];
} 