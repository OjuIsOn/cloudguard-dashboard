import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ResourceGroup } from "@/models/resourceGroup";
import { Subscription } from "@/models/subscription";
import { User } from "@/models/user";
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
    const resourceGoups = await ResourceGroup.find({ userId: tokenPayload.id });

    // Check if empty
    if (!resourceGoups || resourceGoups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No resourceGoups found for this user.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: resourceGoups });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: "Couldn't fetch resourceGoups.",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  await connectDB();
  const userPayload = await getUserFromToken();

  if (!userPayload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  
  const sub = await Subscription.findOne({userId:userPayload.id})
  const user = await User.findById(userPayload.id);
  if (!user || !user.azure || !user.azure.accessToken) {
    return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
  }


  const { resourceGroup, location = "centralindia"} = await req.json();
  const accessToken = user.azure.accessToken;
  const subscriptionId=sub.subscriptionId
  try {
    // 1. Create Resource Group in Azure
    const response = await fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}?api-version=2021-04-01`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ location })
      }
    );

    const result = await response.json();
    console.log(result)
    if (!response.ok) {
      return NextResponse.json({ success: false, message: "Azure error", error: result }, { status: 500 });
    }

    // 2. Save to DB
    const newGroup = await ResourceGroup.create({
      name: resourceGroup,
      location,
      subscriptionId,
      userId: user._id
    });

    return NextResponse.json({ success: true, data: newGroup }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to create resource group", error }, { status: 500 });
  }
}