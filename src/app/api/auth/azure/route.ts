import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;

  // Accept tenant ID from the user — this makes the app truly multi-tenant
  const userTenantId = req.nextUrl.searchParams.get("tenantId") || "common";

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing Azure configuration in environment variables" }, { status: 500 });
  }

  // Define scopes: we need access to Azure Service Management (for deployments and cost API)
  const scope = "https://management.core.windows.net//user_impersonation offline_access";
  const authorizeUrl = `https://login.microsoftonline.com/${userTenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scope)}&prompt=select_account&state=${userTenantId}`;

  console.log("[Azure OAuth] Redirecting to:", authorizeUrl);
  return NextResponse.redirect(authorizeUrl);
}
