import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromSession } from "@/server/adminAuth";
import { savePortfolio, SavePortfolioInput } from "@/server/portfolioManager";

export const runtime = "nodejs";

const renterSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1, "Renter name required"),
  email: z.string().email("Valid email required"),
});

const unitSchema = z.object({
  id: z.string(),
  unitNumber: z.string().min(1, "Unit number required"),
  renters: z.array(renterSchema),
});

const apartmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Apartment name required"),
  postalCode: z.string().min(1, "Postal code required"),
  units: z.array(unitSchema),
});

const portfolioSchema = z.object({
  companyName: z.string().min(1, "Company name required"),
  contactEmail: z.string().optional(),
  apartments: z.array(apartmentSchema),
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = portfolioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload: SavePortfolioInput = parsed.data;
    const result = await savePortfolio(admin.id, payload);

    return NextResponse.json(
      { ok: true, companyId: result.companyId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save portfolio", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again.",
      },
      { status: 500 }
    );
  }
}


