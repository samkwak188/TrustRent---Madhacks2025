import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminUser } from "@/server/adminAuth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid form fields",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const admin = await createAdminUser(
      parsed.data.email,
      parsed.data.password
    );

    return NextResponse.json({ ok: true, admin }, { status: 201 });
  } catch (error) {
    console.error("Admin signup failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}


