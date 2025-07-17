import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { App } from "@/models/app";

export async function GET(
  request: NextRequest,
  context: { params: { appId: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    const app = await App.findById(context.params.appId);
    
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
