// File: src/app/api/apps/[appId]/route.ts

import { connectDB } from "@/lib/db";
import { App } from "@/models/app";
import { NextRequest, NextResponse } from "next/server";

type Context = {
  params: {
    appId: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: Context
) {
  await connectDB();

  try {
    const { appId } = params;

    const app = await App.findById(appId);
    if (!app) {
      return NextResponse.json(
        { success: false, message: "App not Found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: app });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Couldn't get the app",
      },
      { status: 500 }
    );
  }
}
