import { connectDB } from "@/lib/db";
// import { appSchema } from "@/lib/validation";
import { App } from "@/models/app";
import { getUserFromToken } from "@/lib/auth"; // custom JWT utility
import { NextResponse } from "next/server";

// POST /api/apps → Create new app
export async function POST(req: Request) {
  await connectDB();

  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { name, subscriptionId, resourceGroup, appServiceName, budget, } = body;

    // console.log(body)
    const existing = await App.findOne({ name, userId: user.id });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "App with this name already exists for your account.",
        },
        { status: 400 }
      );
    }

    const newApp = await App.create({
      name,
      subscriptionId,
      resourceGroup,
      appServiceName,
      budget,
      userId: user.id,
      
    });

    return NextResponse.json(
      {
        success: true,
        message: "App created successfully.",
        data: newApp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating app:", error);
    return NextResponse.json(
      { success: false, message: String(error) },
      { status: 500 }
    );
  }
}
// ...existing code...

// GET /api/apps → Fetch all apps for current user
export async function GET() {
  await connectDB();

  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const apps = await App.find({ userId: user.id });

    return NextResponse.json(
      { success: true, data: apps },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching apps:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
