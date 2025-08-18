import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { User } from "@/models/user";
import { App } from "@/models/app";

async function setStartupCommand(
  appName: string,
  resourceGroup: string,
  subscriptionId: string,
  accessToken: string
) {
  const apiUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/config/web?api-version=2022-03-01`;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        linuxFxVersion: "NODE|22-lts", // keep runtime updated
        appCommandLine:
          "npm install -g pm2 && pm2 serve /home/site/wwwroot --spa --no-daemon --port 8080",
      },
    }),
  });

  const output = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to set startup command -> ${output}`);
  }

  return JSON.parse(output);
}

export async function POST(req: Request) {
  await connectDB();
  try {
    const form = await req.formData();
    const zipFile = form.get("zip") as File;
    const appId = form.get("appId") as string;

    if (!zipFile || !appId) {
      return NextResponse.json(
        { success: false, message: "Missing zip or appId" },
        { status: 400 }
      );
    }

    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await User.findById(userPayload.id);
    if (!user?.azure) {
      return NextResponse.json(
        { success: false, message: "Azure not linked" },
        { status: 403 }
      );
    }

    const app = await App.findById(appId);
    if (!app?.AppName || !app.resourceGroup || !app.subscriptionId) {
      return NextResponse.json(
        { success: false, message: "App not found or missing config" },
        { status: 404 }
      );
    }

    const appName = app.AppName;
    const accessToken = user.azure.accessToken;
    const buffer = Buffer.from(await zipFile.arrayBuffer());

    // Step 1: Deploy ZIP to Kudu
    const deployRes = await fetch(
      `https://${appName}.scm.azurewebsites.net/api/zipdeploy?isAsync=false&clean=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/zip",
        },
        body: buffer,
      }
    );
    const deployOutput = await deployRes.text();
    if (!deployRes.ok) {
      throw new Error(`Zip deploy failed -> ${deployOutput}`);
    }

    // Step 2: Set startup command (pm2 serve)
    const startupResult = await setStartupCommand(
      appName,
      app.resourceGroup,
      app.subscriptionId,
      accessToken
    );

    const hostedUrl = `https://${appName}.azurewebsites.net`;

    return NextResponse.json({
      success: true,
      message: "React app deployed successfully",
      hostedUrl,
      details: {
        zipDeploy: deployOutput,
        startupConfig: startupResult,
      },
    });
  } catch (err) {
    console.error("Deployment Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Deployment Error",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
