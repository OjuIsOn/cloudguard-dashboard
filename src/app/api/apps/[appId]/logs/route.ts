import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { appRepository } from "@/repositories/app.repository";
import { userRepository } from "@/repositories/user.repository";
import { decrypt } from "@/utils/encryption";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params;
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const app = await appRepository.findById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });
    }

    // Verify ownership
    if (app.userId.toString() !== userPayload.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (!app.AppName) {
      return NextResponse.json({ success: false, message: "App has not been provisioned yet" }, { status: 400 });
    }

    const user = await userRepository.findById(app.userId);
    if (!user || !user.azureTokens) {
      return NextResponse.json({ success: false, message: "Azure tokens missing. Please reconnect Azure." }, { status: 400 });
    }

    // Decrypt the Azure token
    const accessToken = decrypt(
      user.azureTokens.encryptedData,
      user.azureTokens.iv,
      user.azureTokens.authTag
    );

    // Fetch live Docker logs from Azure Kudu API
    const url = `https://${app.AppName}.scm.azurewebsites.net/api/logs/docker`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ success: true, logs: "No logs found yet. Container might still be starting..." });
      }
      return NextResponse.json({ success: false, message: `Failed to fetch logs from Azure (Status ${res.status})` }, { status: 500 });
    }

    const logMetadata = await res.json();
    
    if (!Array.isArray(logMetadata) || logMetadata.length === 0) {
      return NextResponse.json({ success: true, logs: "No docker logs available yet." });
    }

    // Sort by lastUpdated descending to get the latest log file
    logMetadata.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    const latestLogUrl = logMetadata[0].href;

    // Fetch the actual log file content
    const logRes = await fetch(latestLogUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!logRes.ok) {
      return NextResponse.json({ success: false, message: `Failed to download log file (Status ${logRes.status})` }, { status: 500 });
    }

    const text = await logRes.text();
    
    // Take only the last 3000 characters to avoid massive payloads
    const truncatedLogs = text.substring(Math.max(0, text.length - 3000));
    
    return NextResponse.json({ success: true, logs: truncatedLogs });
  } catch (error: any) {
    console.error("Logs Fetch Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
