import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { App } from '@/models/app';

// GET handler for /api/monitor/[appId]
export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    await connectDB(); // Connect to MongoDB

    const app = await App.findById(params.appId); // Find app by ID

    if (!app) {
      return NextResponse.json(
        { success: false, message: 'App not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: app },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/monitor/[appId] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch app' },
      { status: 500 }
    );
  }
}
