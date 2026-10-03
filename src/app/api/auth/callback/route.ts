import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { encrypt } from "@/utils/encryption";
import { getUserFromToken } from "@/lib/auth"; // Assume this gets the current logged in user

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  // The tenant ID is passed back via the OAuth state parameter
  const userTenantId = url.searchParams.get("state") || "common";

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No authorization code provided" }, { status: 400 });
  }

  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
  try {
    // 1. Exchange the code for an access token — use the SAME tenant ID from the authorize step
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${userTenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "https://management.core.windows.net//user_impersonation",
        code: code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || "Failed to fetch access token");
    }

    const { access_token, expires_in, refresh_token } = tokenData;

    // 2. Identify the current user (in a real app, from cookies/session)
    const userPayload = await getUserFromToken();
    if (!userPayload) {
       // For this prototype, if no session, just return success string, but ideally redirect to login
       return NextResponse.json({ error: "Please log in to your dashboard first to link Azure" }, { status: 401 });
    }

    // 3. Encrypt the access token using our AES-256 utility
    const encryptedTokenInfo = encrypt(access_token);

    // 4. Save to the database — store the user's actual tenant ID
    await connectDB();
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await User.findByIdAndUpdate(userPayload.id, {
      azureTokens: {
        encryptedData: encryptedTokenInfo.encryptedData,
        iv: encryptedTokenInfo.iv,
        authTag: encryptedTokenInfo.authTag,
        expiresAt: expiresAt,
        tenantId: userTenantId,
      }
    });

    // 5. Redirect back to the dashboard with success
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?azureLinked=true`);

  } catch (err: any) {
    console.error("OAuth Callback Error:", err);
    return NextResponse.json({ error: "Failed to authenticate with Azure", details: err.message }, { status: 500 });
  }
}
