import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { App } from "@/models/app";

export async function GET(
  _request: Request,
  { params }: { params: { appId: string } }
) {
  try {
    await connectDB();
    const app = await App.findById(params.appId);
    if (!app) {
      return NextResponse.json(
        { success: false, message: "App not Found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: app });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch app" },
      { status: 500 }
    );
  }
}
