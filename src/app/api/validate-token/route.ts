import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { renterInvitations, rentalUnits, apartmentBuildings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Find invitation by access token
    const invitations = await db
      .select({
        invitationId: renterInvitations.id,
        renterName: renterInvitations.renterName,
        renterEmail: renterInvitations.renterEmail,
        status: renterInvitations.status,
        unitNumber: rentalUnits.unitNumber,
        apartmentName: apartmentBuildings.name,
      })
      .from(renterInvitations)
      .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
      .innerJoin(apartmentBuildings, eq(rentalUnits.apartmentId, apartmentBuildings.id))
      .where(eq(renterInvitations.accessToken, token))
      .limit(1);

    if (invitations.length === 0) {
      return NextResponse.json(
        { error: "Invalid token. Please check your email and try again." },
        { status: 404 }
      );
    }

    const invitation = invitations[0];

    // Check if token is already used
    if (invitation.status === "used") {
      return NextResponse.json(
        { error: "This token has already been used. Please sign in with your account." },
        { status: 400 }
      );
    }

    // Return invitation details (without sensitive data)
    return NextResponse.json({
      ok: true,
      renterName: invitation.renterName,
      renterEmail: invitation.renterEmail,
      apartmentName: invitation.apartmentName,
      unitNumber: invitation.unitNumber,
    });
  } catch (error) {
    console.error("Token validation failed", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}


