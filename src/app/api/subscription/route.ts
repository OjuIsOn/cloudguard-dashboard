import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/subscription";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();

  const tokenPayload = await getUserFromToken();
  if (!tokenPayload) {
    return NextResponse.json(
      {
        success: false,
        message: "User not logged in",
      },
      { status: 401 }
    );
  }

  try {
    const subs = await Subscription.find({ userId: tokenPayload.id });

    // Check if empty
    if (!subs || subs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No subscriptions found for this user.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subs });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: "Couldn't fetch subscriptions.",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
