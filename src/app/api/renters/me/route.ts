import { NextResponse } from "next/server";
import { getRenterFromSession } from "@/server/renterAuth";

export const runtime = "nodejs";

export async function GET() {
  const renter = await getRenterFromSession();
  if (!renter) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, renter });
}


