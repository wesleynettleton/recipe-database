export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    const dailyOptions = await db.getDefaultDailyOptions();

    return NextResponse.json({
      success: true,
      dailyOptions,
    });
  } catch (error) {
    console.error('Error fetching default daily options:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch default daily options', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dailyOptions = body.dailyOptions;

    if (!dailyOptions || typeof dailyOptions !== 'object') {
      return NextResponse.json(
        { success: false, error: 'dailyOptions object is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.saveDefaultDailyOptions(dailyOptions);

    const saved = await db.getDefaultDailyOptions();

    return NextResponse.json({
      success: true,
      message: 'Default daily options saved',
      dailyOptions: saved,
    });
  } catch (error) {
    console.error('Error saving default daily options:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to save default daily options', details: errorMessage },
      { status: 500 }
    );
  }
}
