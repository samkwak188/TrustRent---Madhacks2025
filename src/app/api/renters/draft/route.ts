import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRenterSession } from "@/server/renterAuth";
import { getRenterDraft, saveRenterDraft } from "@/server/renterDrafts";

export const runtime = "nodejs";

const draftSchema = z.object({
  state: z.any(),
  checklistImagePreview: z.string().nullable(),
  leaseFileName: z.string().nullable(),
  leaseAnalysis: z.any().nullable(),
});

export async function GET() {
  try {
    const renter = await requireRenterSession();
    const draft = await getRenterDraft(renter.id);
    return NextResponse.json({ draft }, { status: 200 });
  } catch (error) {
    console.error("Failed to load renter draft", error);
    return NextResponse.json(
      { error: "Failed to load saved progress." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const renter = await requireRenterSession();
    const body = await request.json();
    const parsed = draftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid draft payload." },
        { status: 400 }
      );
    }

    await saveRenterDraft(renter.id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save renter draft", error);
    return NextResponse.json(
      { error: "Failed to save progress." },
      { status: 500 }
    );
  }
}



