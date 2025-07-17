import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { App } from '@/models/app';
import { User } from '@/models/user';
import { getCostEstimate } from '@/utils/azure-cost';
import { stopAzureApp } from '@/utils/azure-ops';

export async function GET() {
  await connectDB();

  try {
    const apps = await App.find({});

    const results = [];

    for (const app of apps) {
      if (!app.budget || app.budget === -1) continue;

      const user = await User.findById(app.userId);
      if (!user || !user.azure?.accessToken) continue;

      const cost = await getCostEstimate(
        app._id,
        app.subscriptionId,
        app.resourceGroup,
        app.AppName,
        user.azure.accessToken
      );

      if (cost > app.budget && app.autoShutdownEnabled) {
        const stopResult = await stopAzureApp({
          AppName: app.AppName,
          resourceGroup: app.resourceGroup,
          subscriptionId: app.subscriptionId,
          accessToken: user.azure.accessToken,
        });

        results.push({
          appId: app._id,
          stopped: stopResult.success,
          cost,
          budget: app.budget,
        });
      }
    }

    return NextResponse.json({ success: true, apps: results });
  } catch (error: any) {
    console.error("Error during budget check:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
