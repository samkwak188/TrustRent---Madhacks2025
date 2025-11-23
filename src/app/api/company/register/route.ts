import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CompanyRegistrationInput,
  registerRentalCompany,
} from "@/server/companyRegistration";
import { getAdminFromSession } from "@/server/adminAuth";

export const runtime = "nodejs";

const renterSchema = z.object({
  fullName: z.string().min(2, "Renter name is required"),
  email: z.string().email("Enter a valid renter email"),
});

const unitSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  renters: z.array(renterSchema).min(1, "List at least one renter"),
});

const apartmentSchema = z.object({
  name: z.string().min(2, "Apartment or building name is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  units: z.array(unitSchema).min(1, "Add at least one unit"),
});

const companySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactEmail: z.string().email().optional().nullable(),
  apartments: z
    .array(apartmentSchema)
    .min(1, "Add at least one apartment building"),
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json(
        { error: "You must be signed in as an admin to do this." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Unable to register company. Please fix the highlighted fields.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload: CompanyRegistrationInput = parsed.data;
    const result = await registerRentalCompany(payload, admin.id);

    return NextResponse.json(
      {
        ok: true,
        companyId: result.companyId,
        invitations: result.invitations,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to register rental company", error);
    return NextResponse.json(
      {
        error:
          "We couldn't save this registration. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}

