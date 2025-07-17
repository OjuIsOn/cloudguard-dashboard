import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from "@/lib/db";
import { App } from "@/models/app";

export async function GET(request: NextRequest, { params }: { params: { appId: string } }) {
  try {
    await connectDB();
    const app = await App.findById(params.appId);

    if (!app) {
      return NextResponse.json(
        { success: false, message: "App not Found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: app },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch app" },
      { status: 500 }
    );
  }
}
