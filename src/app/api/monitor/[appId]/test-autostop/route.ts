import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { App } from '@/models/app';
import { User } from '@/models/user';
import { stopAzureApp } from '@/utils/azure-ops';

// @ts-expect-error Next.js provides params at runtime
export async function POST(req: Request, { params }) {
  await connectDB();

  try {
    const { appId } = await params;
    const app = await App.findById(appId);
    
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    if (!app.autoStop) {
      return NextResponse.json({ success: false, message: 'Auto-Stop is not enabled for this app. Please enable it first to test.' }, { status: 400 });
    }

    const user = await User.findById(app.userId);
    if (!user || !user.azureTokens) {
      return NextResponse.json({ success: false, message: 'Azure not linked' }, { status: 403 });
    }

    const { decrypt } = await import('@/utils/encryption');
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

    // MOCK SCENARIO: Pretend the cost is hardLimit + 10
    const mockCost = (app.hardLimit || 0) + 10;
    
    console.log(`[TEST AUTO-STOP] Mocking cost at ₹${mockCost} for hard limit ₹${app.hardLimit}. Triggering shutdown...`);

    const stopResult = await stopAzureApp({
      AppName: app.AppName,
      resourceGroup: app.resourceGroup,
      subscriptionId: app.subscriptionId,
      accessToken: accessToken,
    });

    if (stopResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully tested! Pretended cost was ₹${mockCost} > Hard Limit ₹${app.hardLimit}. App has been stopped.` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to stop app during test',
        error: stopResult.error 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Test Auto-Stop Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
