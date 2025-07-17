// /api/resourceGroup/check-name/route.ts
import { connectDB } from "@/lib/db";
import { ResourceGroup } from "@/models/resourceGroup";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const existing = await ResourceGroup.findOne({ name });
  return NextResponse.json({ exists: !!existing });
}
