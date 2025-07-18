// src/app/api/apps/[appId]/route.ts

import { App } from '@/models/app';
import { NextRequest, NextResponse } from 'next/server';

// Define the shape of the context object
type Params = {
  params: {
    appId: string;
  };
};

// @ts-expect-error Next.js provides params at runtime
export async function GET(req: NextRequest, { params }) {
  const { appId } = await params;

  // Optional: Read query params if needed
  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get('category');

  try {
    const app = await App.findById(appId);

    // Return a JSON response
    return NextResponse.json({
      success: true,
      data: app
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error
    });
  }
}

// @ts-expect-error Next.js provides params at runtime
export async function POST(req: NextRequest, { params }) {
  const { appId } = params;

  try {
    const body = await req.json();

    // Example: Do something with the data
    return NextResponse.json({
      message: 'POST request received',
      appId,
      data: body,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
