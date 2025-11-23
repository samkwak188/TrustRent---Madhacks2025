import { NextResponse } from "next/server";
import { getAdminFromSession } from "@/server/adminAuth";
import { getPortfolio } from "@/server/portfolioManager";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await getPortfolio(admin.id);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Failed to load portfolio", error);
    return NextResponse.json(
      { error: "Failed to load portfolio data" },
      { status: 500 }
    );
  }
}


