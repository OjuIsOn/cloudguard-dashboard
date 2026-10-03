import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { CloudProviderFactory } from "@/strategies/cloudProvider.factory";
import { appRepository } from "@/repositories/app.repository";
import { userRepository } from "@/repositories/user.repository";
import { decrypt } from "@/utils/encryption";
import { connectDB } from "@/lib/db";
import AdmZip from "adm-zip";

/**
 * Normalizes a zip so that the app files sit at the root level.
 * 
 * Problem: Users often zip the parent folder (e.g., "my-app/index.html")
 * instead of the contents ("index.html"). Azure expects files at the root
 * of /home/site/wwwroot, not nested inside a subfolder.
 * 
 * Solution: If every entry in the zip shares a single common top-level
 * directory prefix, strip that prefix so files land at the root.
 */
function normalizeZip(zipBuffer: Buffer): Buffer {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  if (entries.length === 0) return zipBuffer;

  // Check if all entries share a single top-level directory prefix
  // e.g., "my-app/package.json", "my-app/src/index.js" all share "my-app/"
  const topLevelDirs = new Set<string>();
  for (const entry of entries) {
    const firstSlash = entry.entryName.indexOf("/");
    if (firstSlash > 0) {
      topLevelDirs.add(entry.entryName.substring(0, firstSlash + 1));
    } else {
      // There's a file at root level already — no normalization needed
      return zipBuffer;
    }
  }

  // If there's exactly one top-level directory, strip it
  if (topLevelDirs.size !== 1) return zipBuffer;

  const prefix = Array.from(topLevelDirs)[0]; // e.g., "my-app/"
  console.log(`[normalizeZip] Stripping common prefix: "${prefix}"`);

  const newZip = new AdmZip();
  for (const entry of entries) {
    const newName = entry.entryName.substring(prefix.length);
    if (newName === "" || entry.isDirectory) continue; // skip empty or dir-only entries
    newZip.addFile(newName, entry.getData());
  }

  return newZip.toBuffer();
}

async function handler(req: Request) {
  let appIdToUpdate: string | null = null;
  try {
    const body = await req.json();
    const { appId, blobUrl, appType } = body;
    appIdToUpdate = appId;

    if (!appId || !blobUrl) {
      return NextResponse.json({ error: "Missing appId or blobUrl" }, { status: 400 });
    }

    await connectDB();
    const app = await appRepository.findById(appId);
    if (!app) throw new Error("App not found");

    app.deployStatus = 'deploying';
    app.deployMessage = 'Worker is provisioning Azure resources...';
    await app.save();

    const user = await userRepository.findById(app.userId);
    if (!user || !user.azureTokens) throw new Error("User azure tokens not found");

    // Decrypt the Azure token
    const accessToken = decrypt(
      user.azureTokens.encryptedData,
      user.azureTokens.iv,
      user.azureTokens.authTag
    );

    // Fetch the ZIP from Vercel Blob (private store requires auth token)
    const blobResponse = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    const arrayBuffer = await blobResponse.arrayBuffer();
    const rawZipBuffer = Buffer.from(arrayBuffer);

    // CRITICAL: Normalize the zip so files are at root level, not nested in a subfolder
    const zipBuffer = normalizeZip(rawZipBuffer);

    // Simple startup commands that Azure CANNOT mangle
    const startupCommand = appType === 'react'
      ? "npx -y serve -s . -l 8080"
      : "npm install && npm start";

    // Inject the Strategy
    const cloudProvider = CloudProviderFactory.getProvider("AZURE", { accessToken });

    // Apply Environment Variables if provided
    let parsedEnv: any = {};
    if (body.envVars) {
      try {
        parsedEnv = JSON.parse(body.envVars);
      } catch (e) {
        console.error("Failed to parse env vars", e);
      }
    }

    // Explicitly disable Oryx auto-build to prevent "idealTree" npm crashes
    parsedEnv["SCM_DO_BUILD_DURING_DEPLOYMENT"] = "false";

    // Always update app settings
    const { updateAppSettings } = await import('@/utils/azure-env');
    const envResult = await updateAppSettings({
      appName: app.AppName,
      resourceGroup: app.resourceGroup,
      subscriptionId: app.subscriptionId,
      accessToken,
      settings: parsedEnv
    });
    
    if (!envResult.success) {
      console.error("Failed to set env vars before deployment:", envResult.error);
    } else {
      // Also save it to the DB so the monitor page sees it
      app.envVars = { ...app.envVars, ...parsedEnv };
      await app.save();
    }

    // Execute the deployment using the Strategy Pattern!
    const hostedUrl = await cloudProvider.deployApp(zipBuffer, {
      appName: app.AppName,
      resourceGroup: app.resourceGroup,
      subscriptionId: app.subscriptionId,
      startupCommand: startupCommand
    });

    console.log(`Successfully deployed ${app.AppName} to ${hostedUrl}`);

    app.deployStatus = 'live';
    app.deployMessage = hostedUrl;
    await app.save();

    return NextResponse.json({ success: true, url: hostedUrl });
  } catch (error: any) {
    console.error("Worker Deployment Error:", error);

    // Try to update DB to failed state
    try {
      if (appIdToUpdate) {
        await connectDB();
        const failedApp = await appRepository.findById(appIdToUpdate);
        if (failedApp) {
          failedApp.deployStatus = 'failed';
          failedApp.deployMessage = error.message || 'Deployment failed';
          await failedApp.save();
        }
      }
    } catch (e) {
      console.error("Failed to update app status to failed", e);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Wrap the handler with Upstash signature verification to ensure only Upstash can call this route
export const POST = verifySignatureAppRouter(handler);
