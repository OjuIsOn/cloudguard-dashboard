// app/api/auth/azure/callback/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: Request) {
  await connectDB();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ success: false, message: "Missing authorization code." }, { status: 400 });
  }




  const userfromtoken=await getUserFromToken();
  const userId = userfromtoken?.id;
  const user = await User.findById(userId);


  try {
    // Exchange code for access_token
    const tokenRes = await fetch(`https://login.microsoftonline.com/${user.accountCredentials.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: user.accountCredentials.clientId!,
        client_secret: user.accountCredentials.clientSecret!,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.AZURE_REDIRECT_URI!,
        scope: "https://management.azure.com/.default offline_access openid profile"
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({ success: false, message: "Failed to fetch tokens from Azure", error: tokenData }, { status: 500 });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found in database" }, { status: 404 });
    }

    user.azure = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      tenantId: process.env.AZURE_TENANT_ID!,
    };
    user.isDevOps = true;

    await user.save();


return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_BASE_URL}/dashboard?linked=true`);

  } catch (error) {
    return NextResponse.json({ success: false, message: "Something went wrong", error }, { status: 500 });
  }
}
