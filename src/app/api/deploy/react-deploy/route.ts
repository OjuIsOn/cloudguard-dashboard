import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { User } from "@/models/user";
import { App } from "@/models/app";
import { connectDB } from "@/lib/db";

export const maxDuration = 300; // allow up to 5 minutes for upload

export async function POST(req: Request) {
  await connectDB();

  try {
    // 1. Parse incoming form-data
    const form = await req.formData();
    const zipFile = form.get("zip") as File;
    const appId   = form.get("appId") as string;

    if (!zipFile || !appId) {
      return NextResponse.json({ success: false, message: "Missing zip or appId" }, { status: 400 });
    }

    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

   
    const user = await User.findById(userPayload.id);
    if (!user?.azure) {
      return NextResponse.json({ success: false, message: "Azure not linked" }, { status: 403 });
    }
    const accessToken = user.azure.accessToken;

    const app = await App.findById(appId);
    if (!app?.AppName) {
      return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });
    }
    const appName = app.AppName; 

    const arrayBuffer = await zipFile.arrayBuffer();
    const zipBuffer   = Buffer.from(arrayBuffer);

    const zipUrl = `https://${appName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;
    const deployRes = await fetch(zipUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/zip",
      },
      body: zipBuffer,
    });

    let result: any;
    try {
      result = await deployRes.clone().json();
    } catch {
      result = await deployRes.text().catch(() => "(no response body)");
    }

    if (!deployRes.ok) {
      return NextResponse.json({
        success: false,
        message: "Zip deploy failed",
        error: result,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "React build deployed!",
      hostedUrl: `https://${appName}.azurewebsites.net`,
      details: result,
    });
  } catch (err) {
    console.error("Frontend deploy error:", err);
    return NextResponse.json({
      success: false,
      message: "Unexpected server error",
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
