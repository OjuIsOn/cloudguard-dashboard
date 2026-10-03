import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/subscription";
import { User } from "@/models/user";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({
            success: false,
            message: "No name found"
        }, { status: 400 });
    }

    const subscriptionIdParam = searchParams.get('subscriptionId');

    const userPayload = await getUserFromToken();
    if (!userPayload) {
        return NextResponse.json({
            success: false,
            message: "Authenticate first"
        }, { status: 401 });
    }

    const user = await User.findById(userPayload.id);
    if (!user) {
        return NextResponse.json({
            success: false,
            message: "User not found"
        }, { status: 404 });
    }
    
    // Fix: userId should be string matching user.id, not the ObjectId _id
    const subs = await Subscription.find({ userId: userPayload.id })
    
    if (!user.azureTokens) {
        return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
    }
    
    const { decrypt } = await import('@/utils/encryption');
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);
    
    // Use the passed subscriptionId if available, otherwise fallback to the first one in DB
    const subscriptionId = subscriptionIdParam || (subs && subs.length > 0 ? subs[0].subscriptionId : undefined);
    
    try {
        const response = await fetch(
            `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/checkNameAvailability?api-version=2022-03-01`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    type: "Microsoft.Web/sites",
                }),
            }
        );

        const result = await response.json();
        console.log(result)
        return NextResponse.json({
            success: true,
            message: result.nameAvailable,
            fullMessage: result.message  // optional
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Name is not valid or something went wrong'
        }, { status: 500 });
    }
}
