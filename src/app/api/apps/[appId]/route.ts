// src/app/api/apps/[appId]/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Define the shape of the context object
type Params = {
  params: {
    appId: string;
  };
};

export async function GET(req: NextRequest, { params }: Params) {
  const { appId } = params;

  // Optional: Read query params if needed
  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get('category');

  // Return a JSON response
  return NextResponse.json({
    message: 'GET request received',
    appId,
    category,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
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
