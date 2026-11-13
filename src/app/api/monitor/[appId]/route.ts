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

    const cost = await getCostEstimate(
      app._id,
      app.subscriptionId,
      app.resourceGroup,
      app.AppName,
      accessToken
    );

    return NextResponse.json({
      success: true,
      cost,
      budget: app.budget ?? 0,
      hardLimit: app.hardLimit ?? 0,
      autoShutdown: app.autoStop ?? false,
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

    // Trigger Azure Monitor Action Group so Microsoft Azure activates email budget notifications
    let emailAlertActivated = false;
    if (budget && Number(budget) > 0 && user.email && app.subscriptionId && app.resourceGroup) {
      try {
        const { upsertEmailActionGroup } = await import('@/lib/azure/upsertActionGroup');
        const cleanName = (app.AppName || app.name || 'app').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const actionGroupName = `alert-${cleanName}`;
        await upsertEmailActionGroup(
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

    const successMessage = emailAlertActivated
      ? "Settings saved! Microsoft Azure Action Group email alert has been activated."
      : "Settings updated successfully.";

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
