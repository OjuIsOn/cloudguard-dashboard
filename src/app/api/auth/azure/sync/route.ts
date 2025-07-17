import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/subscription";
import { ResourceGroup } from "@/models/resourceGroup";
import { App } from "@/models/app";
import { User } from "@/models/user";

export async function POST(req: Request) {
  await connectDB();

  const tokenPayload = await getUserFromToken();
  if (!tokenPayload) {
    return NextResponse.json({ success: false, message: "User not logged in" }, { status: 401 });
  }

  const user = await User.findById(tokenPayload.id);
  if (!user?.azure?.accessToken) {
    return NextResponse.json({ success: false, message: "Azure account not linked or token missing" }, { status: 403 });
  }
  const accessToken = user.azure.accessToken;

  try {
    // 1️⃣ Sync Subscriptions
    const subsRes = await fetch(
      "https://management.azure.com/subscriptions?api-version=2020-01-01",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const subsData = await subsRes.json();
    const subscriptions = subsData.value || [];

    for (const sub of subscriptions) {
      const { subscriptionId, displayName, tenantId } = sub;
      await Subscription.findOneAndUpdate(
        { subscriptionId, userId: user.id },
        { subscriptionId, displayName, tenantId, userId: user.id },
        { upsert: true }
      );

      // 2️⃣ Sync Resource Groups
      const rgRes = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const rgData = await rgRes.json();
      const groups = rgData.value || [];

      for (const rg of groups) {
        await ResourceGroup.findOneAndUpdate(
          { name: rg.name, subscriptionId, userId: user.id },
          { name: rg.name, location: rg.location, subscriptionId, userId: user.id },
          { upsert: true }
        );
      }

      // 3️⃣ Sync App Services (Web Apps)
      const appRes = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2023-01-01`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const appData = await appRes.json();
      const webApps = appData.value || [];

      for (const site of webApps) {
        // Extract resource group name from resource ID
        const idParts = site.id.split("/resourceGroups/");
        let rgName = "";
        if (idParts.length > 1) {
          rgName = idParts[1].split("/")[0];
        }

        await App.findOneAndUpdate(
          { AppName: site.name, subscriptionId, userId: user.id },
          {
            $setOnInsert: {
              name: site.name,
              AppName: site.name,
            },
            $set: {
              location: site.location,
              subscriptionId,
              resourceGroup: rgName,
              appServiceName: site.name,
              userId: user.id,
              isDraft: false,
              cost: 0,
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully synced subscriptions, resource groups, and apps."
    });
  } catch (err) {
    console.error("Azure sync error:", err);
    return NextResponse.json({ success: false, message: "Azure sync failed", error: err instanceof Error ? err.message : err }, { status: 500 });
  }
}
