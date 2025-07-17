// app/api/auth/azure/route.ts
import { getAzureOAuthUrl } from "@/lib/azure/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const url = await getAzureOAuthUrl();
  return NextResponse.redirect(url);
}
