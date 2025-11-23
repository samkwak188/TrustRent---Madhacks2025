import { NextResponse } from "next/server";
import { getAdminFromSession } from "@/server/adminAuth";
import { getAdminDashboard } from "@/server/adminDashboard";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getAdminDashboard(admin.id);
  return NextResponse.json(dashboard);
}

