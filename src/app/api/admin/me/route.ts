import { NextResponse } from "next/server";
import { getAdminFromSession } from "@/server/adminAuth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, admin });
}


