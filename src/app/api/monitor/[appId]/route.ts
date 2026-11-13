// File: /app/api/monitor/[appId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { App } from '@/models/app';
import { User } from '@/models/user';
import { updateAppSettings } from "@/utils/azure-env";
import { getCostEstimate } from '@/utils/azure-cost';
import { stopAzureApp, restartAzureApp } from '@/utils/azure-ops';
import { CloudProviderFactory } from '@/strategies/cloudProvider.factory';
import { decrypt } from '@/utils/encryption';
import { appRepository } from '@/repositories/app.repository';

// =======================
// GET: Cost & App Settings
// =======================
// @ts-expect-error Next.js provides params at runtime
export async function GET(req: Request, { params }) {
  await connectDB();

  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { appId } = await params;
    const user = await User.findById(userPayload.id);
    const app = await App.findById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    if (!user.azureTokens) {
      return NextResponse.json({ success: false, message: 'Azure not linked' }, { status: 403 });
    }
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

    let cost = 0;
    try {
      cost = await getCostEstimate(
        app._id,
        app.subscriptionId,
        app.resourceGroup,
        app.AppName,
        accessToken
      );
    } catch (costErr: any) {
      console.warn("Could not query Azure Cost API:", costErr.message);
      cost = app.cost || 0;
    }

    // Auto-Stop check: If cost exceeds hardLimit and autoStop is true, shut it down!
    let stoppedByCircuitBreaker = false;
    if (app.autoStop && app.hardLimit && cost > app.hardLimit && app.AppName) {
      try {
        const { stopAzureApp } = await import('@/utils/azure-ops');
        const stopRes = await stopAzureApp({
          AppName: app.AppName,
          resourceGroup: app.resourceGroup,
          subscriptionId: app.subscriptionId,
          accessToken,
        });
        stoppedByCircuitBreaker = stopRes.success;
        if (stoppedByCircuitBreaker) {
          console.log(`[CIRCUIT BREAKER] Hard limit ₹${app.hardLimit} exceeded (Cost: ₹${cost}). App ${app.AppName} stopped.`);
        }
      } catch (stopErr: any) {
        console.error("Auto-stop failed:", stopErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      cost,
      budget: app.budget ?? 0,
      hardLimit: app.hardLimit ?? 0,
      autoShutdown: app.autoStop ?? false,
      stoppedByCircuitBreaker,
      AppName: app.AppName,
      env: app.envVars ?? {},
    });

  } catch (error: any) {
    console.error("GET /monitor error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch data",
      error: error.message || error,
    }, { status: 500 });
  }
}

// =======================
// PUT: Update Budget / AutoStop / Env
// =======================
// @ts-expect-error Next.js provides params at runtime
export async function PUT(req: NextRequest, { params }) {
  await connectDB();

  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const { appId } = await params;
    const user = await User.findById(userPayload.id);
    const app = await App.findById(appId);
    if (!app || app.userId.toString() !== user.id.toString()) {
      return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });
    }

    const body = await req.json();
    const { budget, hardLimit, autoShut, env } = body;

    if (!user.azureTokens) {
      return NextResponse.json({ success: false, message: 'Azure not linked' }, { status: 403 });
    }
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

    if (budget !== undefined) app.budget = budget;
    if (hardLimit !== undefined) app.hardLimit = hardLimit;
    if (autoShut !== undefined) app.autoStop = autoShut;

    // Determine the effective budget amount to provision on Azure (either soft budget or hard limit)
    const budgetAmount = (budget && Number(budget) > 0)
      ? Number(budget)
      : (hardLimit && Number(hardLimit) > 0)
        ? Number(hardLimit)
        : 0;

    // Trigger Azure Monitor Action Group and Native Azure Budget
    let emailAlertActivated = false;
    let azureBudgetCreated = false;

    if (budgetAmount > 0 && user.email && app.subscriptionId && app.resourceGroup) {
      let actionGroupId: string | undefined;
      try {
        const { upsertEmailActionGroup } = await import('@/lib/azure/upsertActionGroup');
        const cleanName = (app.AppName || app.name || 'app').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const actionGroupName = `alert-${cleanName}`;
        actionGroupId = await upsertEmailActionGroup(
          accessToken,
          app.subscriptionId,
          app.resourceGroup,
          actionGroupName,
          user.email
        );
        emailAlertActivated = true;
      } catch (agErr: any) {
        console.warn("[Azure Monitor Action Group] Warning:", agErr.message);
      }

      // Also create/update the native Azure Budget under Cost Management > Budgets
      try {
        const now = new Date();
        const startDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
        const endDate = `${now.getUTCFullYear() + 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;
        const cleanBudgetName = `budget-${app.resourceGroup.replace(/[^a-zA-Z0-9-_]/g, '')}`;

        const budgetPayload = {
          properties: {
            category: "Cost",
            amount: budgetAmount,
            timeGrain: "Monthly",
            timePeriod: { startDate, endDate },
            notifications: {
              budgetBreach: {
                enabled: true,
                operator: "GreaterThan",
                threshold: 90,
                contactEmails: [user.email],
                ...(actionGroupId ? { contactGroups: [actionGroupId] } : {}),
              },
            },
          },
        };

        const budgetUrl = `https://management.azure.com/subscriptions/${app.subscriptionId}/resourceGroups/${app.resourceGroup}/providers/Microsoft.Consumption/budgets/${cleanBudgetName}?api-version=2023-03-01`;

        const budgetRes = await fetch(budgetUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(budgetPayload),
        });

        if (budgetRes.ok) {
          azureBudgetCreated = true;
          console.log(`[Azure Budget] Created/Updated ${cleanBudgetName} with amount ₹${budget}`);
        } else {
          const budgetErr = await budgetRes.text();
          console.warn("[Azure Budget] API Response:", budgetErr);
        }
      } catch (bErr: any) {
        console.warn("[Azure Budget] Could not create Azure budget:", bErr.message);
      }
    }

    if (env && typeof env === "object") {
      // Only call Azure if the app is already provisioned on Azure
      if (app.AppName) {
        const updateResult = await updateAppSettings({
          appName: app.AppName,
          resourceGroup: app.resourceGroup,
          subscriptionId: app.subscriptionId,
          accessToken: accessToken,
          settings: env,
        });

        if (!updateResult.success) {
          const errMsg = typeof updateResult.error === 'object' ? JSON.stringify(updateResult.error) : updateResult.error;
          return NextResponse.json({
            success: false,
            message: `Failed to update Azure environment variables: ${errMsg || 'Azure rejected settings'}`,
            error: updateResult.error,
          }, { status: 500 });
        }
      }

      // CRITICAL: Mongoose schema defines envVars as String. Serialize to avoid CastError.
      let existingEnv: Record<string, string> = {};
      try {
        if (app.envVars) {
          existingEnv = typeof app.envVars === 'string' ? JSON.parse(app.envVars) : app.envVars;
        }
      } catch (e) {}

      const mergedEnv = { ...existingEnv, ...env };
      const sanitizedEnv: Record<string, string> = {};
      for (const [k, v] of Object.entries(mergedEnv)) {
        if (v !== undefined && v !== null) {
          sanitizedEnv[k] = String(v);
        }
      }

      app.envVars = JSON.stringify(sanitizedEnv);
    }

    await app.save();

    let successMessage = "Settings updated successfully.";
    if (azureBudgetCreated) {
      successMessage = `Settings saved! Azure Budget of ₹${budget} and Action Group alert have been created in your Azure Portal.`;
    } else if (emailAlertActivated) {
      successMessage = "Settings saved! Microsoft Azure Action Group email alert has been activated.";
    }

    return NextResponse.json({ success: true, message: successMessage });

  } catch (error: any) {
    console.error("PUT /monitor error:", error);
    return NextResponse.json({
      success: false,
      message: "Update failed",
      error: error.message || error,
    }, { status: 500 });
  }
}

// =======================
// POST: Stop / Restart / Delete
// =======================
// @ts-expect-error Next.js provides params at runtime
export async function POST(req: Request, { params }) {
  await connectDB();

  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { appId } = await params;
    const user = await User.findById(userPayload.id);
    const app = await App.findById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: 'App not found' }, { status: 404 });
    }

    if (!user.azureTokens) {
      return NextResponse.json({ success: false, message: 'Azure not linked' }, { status: 403 });
    }
    const accessToken = decrypt(user.azureTokens.encryptedData, user.azureTokens.iv, user.azureTokens.authTag);

    const body = await req.json();
    const { action } = body;

    if (action === 'stop') {
      await stopAzureApp({ ...app._doc, accessToken: accessToken });
    } else if (action === 'delete') {
      const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });
      try {
        await cloudProvider.deleteApp(app.AppName, app.resourceGroup, app.subscriptionId);
      } catch (err: any) {
        console.warn(`Azure delete failed (likely already deleted): ${err.message}`);
      }
      await appRepository.delete(appId);
      console.log(`Successfully deleted app ${appId}`);
    } else if (action === 'restart') {
      const result = await restartAzureApp({ ...app._doc, accessToken: accessToken });
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.message, error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Action '${action}' completed.` });

  } catch (error: any) {
    console.error("POST /monitor error:", error);
    return NextResponse.json({
      success: false,
      message: "Operation failed",
      error: error.message || error,
    }, { status: 500 });
  }
}
