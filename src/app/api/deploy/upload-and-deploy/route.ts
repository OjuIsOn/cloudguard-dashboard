import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { User } from "@/models/user";
import { App } from "@/models/app";
import { connectDB } from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: Request) {
  await connectDB();

  try {
    const formData = await req.formData();

    const file = formData.get("zip") as File;
    const appId = formData.get("appId") as string;

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
    const app = await App.findById(appId);
    if (!app) {
      return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });
    }

    const { resourceGroup, subscriptionId } = app;
    const appName = app.AppName;

    if (!file || !appName || !accessToken || !resourceGroup || !subscriptionId) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const kuduUrl = `https://${appName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;

    const response = await fetch(kuduUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/zip",
      },
      body: buffer,
    });

    // ✅ Safely parse result once
    let result: any;
    try {
      result = await response.clone().json(); // clone before consuming
    } catch {
      try {
        result = await response.text();
      } catch {
        result = "Unable to parse deployment response.";
      }
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: "Deployment failed",
        error: result,
      }, { status: 500 });
    }



    // //command line
    const bash = await fetch(`https://${appName}.scm.azurewebsites.net/api/command`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "bash -c \"cd /home/site/wwwroot && npm ci --only=production\""
      })
    });


    console.log(await bash.json());


    const hostedUrl = `https://${appName}.azurewebsites.net`;

    return NextResponse.json({
      success: true,
      message: "App deployed successfully!",
      hostedUrl,
      deploymentResult: result,
    });

  } catch (error) {
    console.error("Deployment Error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
