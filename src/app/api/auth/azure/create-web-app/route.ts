import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { App } from "@/models/app";
import { ResourceGroup } from "@/models/resourceGroup";
import { User } from "@/models/user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    await connectDB();
    const userPayload = await getUserFromToken();
    if (!userPayload) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userId = userPayload.id;
    const user = await User.findById(userId);
    if (!user || !user.azureTokens) {
        return NextResponse.json({ success: false, message: "Azure account is not linked" }, { status: 404 });
    }

    const { decrypt } = await import('@/utils/encryption');
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);
    const { Appname, resourceGroup, subscriptionId, _id, location: requestedLocation, plan: requestedPlan } = await req.json();

    if (!Appname || !resourceGroup || !subscriptionId || !accessToken) {
        return NextResponse.json({ success: false, message: "Missing required fields!" }, { status: 400 });
    }

    const SKU_MAPPING: Record<string, { name: string; tier: string; size: string; family: string; capacity: number }> = {
        F1: { name: "F1", tier: "Free", size: "F1", family: "F", capacity: 1 },
        B1: { name: "B1", tier: "Basic", size: "B1", family: "B", capacity: 1 },
        B2: { name: "B2", tier: "Basic", size: "B2", family: "B", capacity: 1 },
        S1: { name: "S1", tier: "Standard", size: "S1", family: "S", capacity: 1 },
    };

    const planKey = (requestedPlan || "F1").toUpperCase();
    const selectedSku = SKU_MAPPING[planKey] || SKU_MAPPING.F1;

    const rgPayload = await ResourceGroup.findOne({ userId, subscriptionId, name: resourceGroup });
    const location = requestedLocation || rgPayload?.location || "indiasouthcentral";
    const baseUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}`;
    const appServicePlanName = `plan-${selectedSku.name.toLowerCase()}-${location.toLowerCase()}`;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };

    try {
        // Register Microsoft.Web if needed
        const providerRes = await fetch(
            `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web?api-version=2022-01-01`,
            { headers }
        );
        const provider = await providerRes.json();

        if (provider.registrationState !== "Registered") {
            await fetch(
                `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/register?api-version=2022-01-01`,
                { method: "POST", headers }
            );

            for (let i = 0; i < 5; i++) {
                const poll = await fetch(
                    `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web?api-version=2022-01-01`,
                    { headers }
                );
                const status = await poll.json();
                if (status.registrationState === "Registered") break;
                await new Promise((res) => setTimeout(res, 2000));
            }
        }

        // Check if Linux App Service Plan exists
        const planUrl = `${baseUrl}/providers/Microsoft.Web/serverfarms/${appServicePlanName}?api-version=2022-03-01`;
        const checkPlanRes = await fetch(planUrl, { method: "GET", headers });

        if (checkPlanRes.status === 200) {
            console.log("Linux App Service Plan already exists. Skipping creation.");
        } else if (checkPlanRes.status === 404) {
            const planCreateRes = await fetch(planUrl, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    location,
                    sku: selectedSku,
                    kind: "linux",
                    properties: {
                        reserved: true, // this is key for Linux plans
                    },
                }),
            });

            const planResult = await planCreateRes.json();

            if (!planCreateRes.ok) {
                const planErrorMsg = planResult?.error?.message || planResult?.message || "Failed to create Linux service plan";
                return NextResponse.json({
                    success: false,
                    message: planErrorMsg,
                    error: planResult,
                }, { status: 500 });
            }
        } else {
            const errorText = await checkPlanRes.text();
            return NextResponse.json({
                success: false,
                message: "Error checking service plan",
                error: errorText,
            }, { status: checkPlanRes.status });
        }

        // Create Linux Web App
        const appUrl = `${baseUrl}/providers/Microsoft.Web/sites/${Appname}?api-version=2022-03-01`;

        const appRes = await fetch(appUrl, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                location,
                kind: "app,linux", // Linux web app
                properties: {
                    serverFarmId: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/serverfarms/${appServicePlanName}`,
                    siteConfig: {
                        linuxFxVersion: "NODE|18-lts", // You can change node version as needed
                    },
                },
            }),
        });

        const appResult = await appRes.json();

        if (!appRes.ok) {
            const appErrorMsg = appResult?.error?.message || appResult?.message || "Failed to create Linux Web App.";
            return NextResponse.json({
                success: false,
                message: appErrorMsg,
                error: appResult,
            }, { status: 500 });
        }

        // Mark deployment done in DB
        await App.findByIdAndUpdate(_id, {
            isDraft: false,
            AppName: Appname,
            location: location,
            planTier: selectedSku.name,
            deployedAt: new Date(),
        });

        const hostedUrl = `https://${Appname}.azurewebsites.net`;

        return NextResponse.json({
            success: true,
            message: "Linux Web App created successfully",
            hostedUrl,
            data: appResult,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Unexpected error during deployment",
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
