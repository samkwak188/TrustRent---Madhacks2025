import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdminUser } from "@/server/adminAuth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid credentials",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const admin = await loginAdminUser(parsed.data.email, parsed.data.password);
    return NextResponse.json({ ok: true, admin }, { status: 200 });
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}


