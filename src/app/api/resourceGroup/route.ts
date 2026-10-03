import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ResourceGroup } from "@/models/resourceGroup";
import { Subscription } from "@/models/subscription";
import { User } from "@/models/user";
import { SubscriptIcon } from "lucide-react";
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
  const subscription = await Subscription.findOne({ userId: tokenPayload.id });
  if (!subscription) {
    return NextResponse.json({ success: true, data: [] }); // Return empty array if no sub
  }
  const user = await User.findById(tokenPayload.id);

    if (!user || !user.azureTokens) {
        return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
    }

    const { decrypt } = await import('@/utils/encryption');
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

  try {
    const resourceGoups = await ResourceGroup.find({ subscriptionId: subscription.subscriptionId });

    // Fetch actual live Resource Groups from Azure
    const { CloudProviderFactory } = await import('@/strategies/cloudProvider.factory');
    const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });
    const azureRGs = await cloudProvider.listResourceGroups(subscription.subscriptionId);
    const azureRGNames = azureRGs.map((rg: any) => rg.name);

    // Filter DB groups that still exist in Azure
    const validResourceGroups = resourceGoups.filter((rg) => azureRGNames.includes(rg.name));

    if (!validResourceGroups || validResourceGroups.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No resourceGoups found for this user.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: validResourceGroups });
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

  const sub = await Subscription.findOne({ userId: userPayload.id })
  const user = await User.findById(userPayload.id);
  if (!user || !user.azureTokens) {
    return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
  }

  const { resourceGroup, location = "centralindia" } = await req.json();
  
  const { decrypt } = await import('@/utils/encryption');
  const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);
  
  const subscriptionId = sub.subscriptionId
  try {
    // 1. Create Resource Group in Azure via Strategy
    const { CloudProviderFactory } = await import('@/strategies/cloudProvider.factory');
    const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });
    await cloudProvider.createResourceGroup(resourceGroup, location, subscriptionId);

    // 2. Save to DB
    const newGroup = await ResourceGroup.create({
      name: resourceGroup,
      location,
      subscriptionId,
      userId: user._id,
      budget: 100,
      cost: 0,
      autoStop: false,
    });

    return NextResponse.json({ success: true, data: newGroup }, { status: 201 });

  } catch (error: any) {
    console.error("Resource group creation failed:", error.message || error);
    return NextResponse.json({ success: false, message: "Failed to create resource group", error: error.message || error }, { status: 500 });
  }
}