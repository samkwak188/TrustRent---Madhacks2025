import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { renterInvitations, rentalUnits, apartmentBuildings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createRenterAccount } from "@/server/renterAuth";

export const runtime = "nodejs";

const registrationSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registrationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, fullName, email, password } = parsed.data;

    // Find invitation by access token
    const invitations = await db
      .select({
        invitationId: renterInvitations.id,
        renterName: renterInvitations.renterName,
        renterEmail: renterInvitations.renterEmail,
        status: renterInvitations.status,
        unitId: rentalUnits.id,
        unitNumber: rentalUnits.unitNumber,
        apartmentId: apartmentBuildings.id,
        apartmentName: apartmentBuildings.name,
        companyId: apartmentBuildings.companyId,
      })
      .from(renterInvitations)
      .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
      .innerJoin(apartmentBuildings, eq(rentalUnits.apartmentId, apartmentBuildings.id))
      .where(eq(renterInvitations.accessToken, token))
      .limit(1);

    if (invitations.length === 0) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    const invitation = invitations[0];

    if (invitation.status === "used") {
      return NextResponse.json(
        { error: "This token has already been used. Please sign in." },
        { status: 400 }
      );
    }

    // Enforce email match: renter must register with the same email the invitation was sent to
    if (email.toLowerCase() !== invitation.renterEmail.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            "Please use the same email address that received your TrustRent invite.",
        },
        { status: 400 }
      );
    }

    // Create renter account
    const renter = await createRenterAccount({
      email: email.toLowerCase(),
      password,
      fullName: fullName.trim(),
      apartmentName: invitation.apartmentName,
      unitNumber: invitation.unitNumber,
      companyId: invitation.companyId || undefined,
    });

    // Mark invitation as used and link to renter
    const now = Date.now();
    await db
      .update(renterInvitations)
      .set({
        status: "used",
        activatedAt: now,
      })
      .where(eq(renterInvitations.id, invitation.invitationId));

    // Note: accessToken is already stored in the renters table via createRenterAccount if needed

    return NextResponse.json(
      {
        ok: true,
        message: "Account created successfully",
        renterId: renter.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Renter registration failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}
