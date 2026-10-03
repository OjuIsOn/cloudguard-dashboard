import { NextResponse } from 'next/server';
export const maxDuration = 60; // Max execution time for Vercel Hobby Tier
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
      if (!user || !user.azureTokens) continue;

      const { decrypt } = await import('@/utils/encryption');
      const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

      const cost = await getCostEstimate(
        app._id,
        app.subscriptionId,
        app.resourceGroup,
        app.AppName,
        accessToken
      );

      if (app.hardLimit && cost > app.hardLimit && app.autoStop) {
        const stopResult = await stopAzureApp({
          AppName: app.AppName,
          resourceGroup: app.resourceGroup,
          subscriptionId: app.subscriptionId,
          accessToken: accessToken,
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
