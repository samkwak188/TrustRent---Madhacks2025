import { NextResponse } from "next/server";
import { clearRenterSession } from "@/server/renterAuth";

export const runtime = "nodejs";

export async function POST() {
  await clearRenterSession();
  return NextResponse.json({ ok: true });
}


