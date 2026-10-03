import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Client } from "@upstash/qstash";
import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { App } from "@/models/app";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(req: Request) {
  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("zip") as File;
    const appId = formData.get("appId") as string;
    const appType = formData.get("appType") as string || "nodejs"; // fallback to nodejs
    const envVars = formData.get("envVars") as string; // Optional JSON string

    if (!file || !appId) {
      return NextResponse.json({ success: false, message: "Missing zip or appId" }, { status: 400 });
    }

    // 1. Store the ZIP file in Vercel Blob (temporary storage)
    const blob = await put(`deployments/${appId}-${Date.now()}.zip`, file, {
      access: "private",
    });

    // Update DB status to queued
    await connectDB();
    await App.findByIdAndUpdate(appId, {
      deployStatus: 'queued',
      deployMessage: 'Zip uploaded. Waiting for worker to pick up...',
      appType: appType,
    });

    // 2. Enqueue the background deployment task using Upstash QStash
    const workerUrl = `${process.env.NEXTAUTH_URL}/api/workers/deploy`;
    
    await qstash.publishJSON({
      url: workerUrl,
      headers: {
        "ngrok-skip-browser-warning": "true", // Bypasses the Ngrok warning screen
        "Bypass-Tunnel-Reminder": "true",     // Bypasses the Localtunnel warning screen
      },
      body: {
        appId: appId,
        blobUrl: blob.url, // The worker will authenticate using BLOB_READ_WRITE_TOKEN
        appType: appType,  // Pass the type to determine the startup command
        envVars: envVars,  // Pass the environment variables
      },
    });

    // 3. Instantly return success to the frontend (No Vercel timeouts!)
    return NextResponse.json({
      success: true,
      message: "Deployment queued successfully! Your app is being deployed in the background.",
    });

  } catch (error: any) {
    console.error("Queueing Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
