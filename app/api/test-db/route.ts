import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test database connection
    const db = getDatabase();
    console.log('Database instance created successfully');
    
    // Test a simple query
    const count = await db.getIngredientsCount();
    console.log('Database query successful, ingredient count:', count);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      ingredientCount: count
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 