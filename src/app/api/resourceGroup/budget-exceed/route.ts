// /app/api/budget-exceeded/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Subscription } from '@/models/subscription';
import { User } from '@/models/user';
import { App as AppModel } from '@/models/app';  // adjust import to your App schema
import { ResourceGroup } from '@/models/resourceGroup';
import { getUserFromToken } from '@/lib/auth';
// import { sendAlertEmail } from '@/lib/email/sendAlertEmail';

export async function POST(req: NextRequest) {
    // 1) Validate authKey
    const url = new URL(req.url);
    if (url.searchParams.get('authKey') !== process.env.BUDGET_WEBHOOK_KEY) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // 2) Parse Azure’s payload to get the RG and subscription
    const body = await req.json();
    const scope: string =
        body?.data?.context?.resourceId ||
        body?.data?.context?.resourceGroupName ||
        body?.properties?.context?.resourceUri;
    if (!scope) {
        return NextResponse.json({ success: false, message: 'Cannot determine resource group' }, { status: 400 });
    }
    const [, , subscriptionId, , resourceGroup] = scope.split('/');

    // 3) Lookup user & token
    await connectDB();
    const subDoc = await Subscription.findOne({ subscriptionId });
    const resource = await ResourceGroup.findOne({ name: resourceGroup })

    if (!subDoc) {
        return NextResponse.json({ success: false, message: 'Unknown subscription' }, { status: 404 });
    }


    const resourceSettings = await ResourceGroup.findOne({
        subscriptionId,
        name: resourceGroup
    });
    if (!resourceSettings) {
        return NextResponse.json({ success: false, message: 'Resource group not tracked' }, { status: 404 });
    }
    if (!subDoc?.userId) {
        return NextResponse.json({ success: false, message: 'User not authenticated' }, { status: 401 });
    }

    const user = await User.findOne({ _id: subDoc.userId });
    
    if (!user?.email) {
        return NextResponse.json({ success: false, message: 'User email not set' }, { status: 500 });
    }

    if (!resourceSettings.autoStop) {
        // await sendAlertEmail({
        //     to: user.email,
        //     resourceGroup,
        // });
        return NextResponse.json({ success: true, message: "auto shutdown is turned off" });
    }

    // 4) If autoStop is disabled, just email and return

    // 4) Fetch all your App records in this RG
    const apps = await AppModel.find({
        subscriptionId,
        resourceGroup
    }).lean();

    if (!apps.length) {
        return NextResponse.json({ success: true, message: 'No apps to stop' });
    }

    // 5) Call your internal “manage Web App” route for each
    const origin = url.origin;
    await Promise.all(
        apps.map(app =>
            fetch(`${origin}/api/monitor/${app._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' })
            })
        )
    );

    return NextResponse.json({ success: true, stopped: apps.length });
}
