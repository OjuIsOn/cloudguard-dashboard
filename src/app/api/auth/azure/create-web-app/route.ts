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
    if (!user || !user.azure) {
        return NextResponse.json({ success: false, message: "Azure account is not linked" }, { status: 404 });
    }

    const accessToken = user.azure.accessToken;
    const { Appname, resourceGroup, subscriptionId, _id } = await req.json();

    if (!Appname || !resourceGroup || !subscriptionId || !accessToken) {
        return NextResponse.json({ success: false, message: "Missing required fields!" }, { status: 400 });
    }

    const rgPayload = await ResourceGroup.findOne({ userId, subscriptionId, name: resourceGroup });
    const location = rgPayload?.location;
    const baseUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}`;
    const appServicePlanName = "linuxKaServicePLAN";

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
                    sku: {
                        name: "F1",
                        tier: "Free",
                        size: "F1",
                        family: "F",
                        capacity: 1,
                    },
                    kind: "linux",
                    properties: {
                        reserved: true, // this is key for Linux plans
                    },
                }),
            });

            const planResult = await planCreateRes.json();

            if (!planCreateRes.ok) {
                return NextResponse.json({
                    success: false,
                    message: "Failed to create Linux service plan",
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
            return NextResponse.json({
                success: false,
                message: "Failed to create Linux Web App.",
                error: appResult,
            }, { status: 500 });
        }

        // Mark deployment done in DB
        await App.findByIdAndUpdate(_id, {
            isDraft: false,
            AppName: Appname,
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
