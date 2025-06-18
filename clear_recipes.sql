-- Clear all recipe ingredients first (due to foreign key constraint)
DELETE FROM recipe_ingredients;

-- Clear all recipes
DELETE FROM recipes;

-- Reset the auto-increment sequences
ALTER SEQUENCE recipes_id_seq RESTART WITH 1;
ALTER SEQUENCE recipe_ingredients_id_seq RESTART WITH 1; 