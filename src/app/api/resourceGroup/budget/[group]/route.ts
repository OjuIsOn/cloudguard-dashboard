import { getUserFromToken } from "@/lib/auth";
import { upsertActionGroup } from "@/lib/azure/upsertActionGroup";
import { connectDB } from "@/lib/db";
import { ResourceGroup } from "@/models/resourceGroup";
import { Subscription } from "@/models/subscription";
import { User } from "@/models/user";
import { NextRequest, NextResponse } from "next/server";
import { date } from "zod";

// @ts-expect-error Next.js provides params at runtime
export async function PUT(req: NextRequest, { params }) {
    await connectDB();

    const userPayload = await getUserFromToken();
    if (!userPayload) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userPayload.id);
    const sub = await Subscription.findOne({ userId: userPayload.id });

    if (!user || !user.azure || !user.azure.accessToken) {
        return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
    }

    const { amount = 1000, threshold = 100, autoShut } = await req.json();
    const accessToken = user.azure.accessToken;

    const { group } = await params;
    const resource = await ResourceGroup.findOne({ name: group });

    const subscriptionId = resource.subscriptionId;
    const resourceGroup = resource.name;
    const budgetName = `budget-${resourceGroup}`;


    // 3. If auto-shutdown is enabled, create/update the Action Group
    const webhookUri = `https://${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/resourceGroup/budget-exceed?authKey=${process.env.BUDGET_WEBHOOK_KEY}`;
    let actionGroupId: string | undefined;
    if (autoShut) {
        actionGroupId = await upsertActionGroup(
            user.azure.accessToken,
            subscriptionId,
            resourceGroup,
            {

                notifications: {
                    webhook: [
                        {
                            name: 'budgetExceededWebhook',
                            uri: webhookUri,
                            commonAlertSchema: true,
                        },
                    ],
                    // you can optionally add email receivers here:
                    // email: [{ name: 'ops', address: user.email }]
                },
            }
        );
    }

    console.log(autoShut)
    // 4. Build your budgetPayload, including actionGroups if you have one
    const now = new Date();

    const startDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
    const endDate = `${now.getUTCFullYear() + 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;


    const budgetPayload: any = {
        properties: {
            category: "Cost",
            amount: Number(amount ?? 1000),
            timeGrain: "Monthly",
            timePeriod: { startDate, endDate },
            notifications: {
                budgetBreach: {
                    enabled: true,
                    operator: "GreaterThan",
                    threshold: Number(threshold ?? 100),
                    contactEmails: [user.email],
                    webhookNotification: { serviceUri: webhookUri, properties: { authKey: process.env.BUDGET_WEBHOOK_KEY! } },
                    ...(actionGroupId ? { actionGroups: [actionGroupId] } : {})
                }
            }
        }
    };


    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Consumption/budgets/${budgetName}?api-version=2023-03-01`;

    try {
        const budgetRes = await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(budgetPayload)
        });

        const budgetData = await budgetRes.json();

        if (!budgetRes.ok) {
            console.log(budgetData)
            return NextResponse.json({
                success: false,
                message: "Failed to create or update budget",
                error: budgetData
            }, { status: 500 });
        }
        const res = await ResourceGroup.findByIdAndUpdate(resource._id, {
            budget: amount,
            autoStop: autoShut
        })

        if (!res) return NextResponse.json({ success: false, message: "couldn't update the database" })

        return NextResponse.json({ success: true, data: budgetData }, { status: 200 });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Budget creation error",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}


// @ts-expect-error Next.js provides params at runtime
export async function GET(req: NextRequest, { params }) {
    await connectDB();
    const { group } = await params;
    try {
        const resource = await ResourceGroup.findOne({ name: group });

        //   const subscriptionId = resource.subscriptionId
        //   const resourceGroup = resource.resourceGroup 
        //   const userPayload=await getUserFromToken();
        //   const user=await User.findById(userPayload?.id);
        //   const accessToken=user.azure.accessToken;

        //   const budgetName = 'azora-auto-budget'; 

        //   const url = `https://management.azure.com${group}/providers/Microsoft.Consumption/budgets/${budgetName}?api-version=2023-05-01`;

        //   try {
        //     const res = await fetch(url, {
        //       method: 'GET',
        //       headers: {
        //         Authorization: `Bearer ${accessToken}`,
        //         'Content-Type': 'application/json',
        //       },
        //     });

        //     if (!res.ok) {
        //       const errorBody = await res.text();
        //       return NextResponse.json({ error: 'Failed to fetch budget', details: errorBody }, { status: res.status });
        //     }

        //     const data = await res.json();
        // return NextResponse.json(data);



        return NextResponse.json({
            data: resource
        })


    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: 'Internal Server Error', details: err }, { status: 500 });
    }
}