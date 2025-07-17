import { NextResponse } from "next/server";
import AdmZip from "adm-zip";

export const maxDuration = 60; // Optional: Vercel timeout config

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("zip") as File;
    const appType = formData.get("appType") as string;

    if (!file || !appType) {
      return NextResponse.json({
        success: false,
        message: "Missing ZIP file or app type.",
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().map((e) => e.entryName);

    const { valid, error } = validateZipEntries(entries, zip, appType);

    if (!valid) {
      return NextResponse.json({
        success: false,
        message: "Validation failed.",
        hint: error,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "ZIP is valid.",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

function validateZipEntries(entries: string[], zip: AdmZip, appType: string): { valid: boolean, error?: string } {
  switch (appType) {
    case "react":
      if (!entries.includes("index.html") && !entries.includes("build/index.html")) {
        return {
          valid: false,
          error: "Missing `index.html`. Did you forget to build the app (run `npm run build`)?"
        };
      }
      return { valid: true };

    case "node":
      if (!entries.includes("package.json")) {
        return {
          valid: false,
          error: "Missing `package.json`. This is required to install and start the Node app."
        };
      }
      try {
        const pkgJson = JSON.parse(zip.readAsText("package.json"));
        if (!pkgJson.scripts?.start) {
          return {
            valid: false,
            error: "`start` script is missing in `package.json`. Add \"start\": \"node server.js\"."
          };
        }
      } catch (e) {
        return {
          valid: false,
          error: "Could not parse `package.json`. Is it a valid JSON file?"
        };
      }
      return { valid: true };

    case "next":
      if (!entries.find(e => e.startsWith(".next/"))) {
        return {
          valid: false,
          error: "Missing `.next/` folder. Did you run `npm run build`?"
        };
      }
      if (!entries.includes("package.json")) {
        return {
          valid: false,
          error: "`package.json` is required to deploy a Next.js app."
        };
      }
      return { valid: true };

    default:
      return {
        valid: false,
        error: `Unknown app type: ${appType}`
      };
  }
}
