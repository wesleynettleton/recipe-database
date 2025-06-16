import 'dotenv/config';
import { getDatabase } from './lib/database';

async function testConnection() {
  try {
    const db = getDatabase();
    console.log('Testing database connection...');
    
    // Try to get all ingredients (should work even if table is empty)
    const ingredients = await db.getAllIngredients();
    console.log('✅ Database connection successful!');
    console.log(`Found ${ingredients.length} ingredients in the database.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection(); 