import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { User } from '@/models/user';
import { connectDB } from '@/lib/db';
import { CloudProviderFactory } from '@/strategies/cloudProvider.factory';
import { decrypt } from '@/utils/encryption';
import { ResourceGroup } from '@/models/resourceGroup';

// @ts-expect-error Next.js provides params at runtime
export async function GET(req: Request, { params }) {
  await connectDB();
  const { group } = await params;

  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(userPayload.id);
    if (!user || !user.azureTokens) {
      return NextResponse.json({ success: false, message: 'Azure not linked' }, { status: 403 });
    }

    const resource = await ResourceGroup.findOne({ name: group, userId: user._id });
    if (!resource) {
      return NextResponse.json({ success: false, message: 'Resource Group not found in DB' }, { status: 404 });
    }

    const accessToken = decrypt(
      user.azureTokens.encryptedData,
      user.azureTokens.iv,
      user.azureTokens.authTag
    );

    const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });
    const resources = await cloudProvider.listResources(group, resource.subscriptionId);

    // Also fetch the apps from DB so the frontend knows which resources are "Web Apps" tracked by us.
    const { App } = await import('@/models/app');
    const dbApps = await App.find({ resourceGroup: group, userId: user._id });

    return NextResponse.json({
      success: true,
      resources,
      dbApps,
      subscriptionId: resource.subscriptionId,
      tenantId: user.azureTokens.tenantId // to construct Azure Portal URL
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch resources',
      error: error.message
    }, { status: 500 });
  }
}
