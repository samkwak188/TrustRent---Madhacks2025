import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getAdminFromSession } from "@/server/adminAuth";
import { db } from "@/server/db/client";
import {
  renterInvitations,
  rentalUnits,
  apartmentBuildings,
  rentalCompanies,
} from "@/server/db/schema";

export const runtime = "nodejs";

const schema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Find the invitation and verify it belongs to this admin's company
    const inviteRow = (
      await db
        .select({
          id: renterInvitations.id,
          status: renterInvitations.status,
          companyId: apartmentBuildings.companyId,
        })
        .from(renterInvitations)
        .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
        .innerJoin(
          apartmentBuildings,
          eq(rentalUnits.apartmentId, apartmentBuildings.id)
        )
        .where(eq(renterInvitations.id, parsed.data.invitationId))
        .limit(1)
    )[0];

    if (!inviteRow) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const companies = await db
      .select()
      .from(rentalCompanies)
      .where(eq(rentalCompanies.adminId, admin.id))
      .limit(1);

    if (companies.length === 0 || companies[0].id !== inviteRow.companyId) {
      return NextResponse.json(
        { error: "Invitation not found or access denied" },
        { status: 403 }
      );
    }

    if (inviteRow.status === "used") {
      return NextResponse.json(
        { error: "Cannot withdraw an invitation that has already been used" },
        { status: 400 }
      );
    }

    // For pending or other non-used statuses, delete the invitation so a fresh
    // one can be created without conflicts.
    await db
      .delete(renterInvitations)
      .where(eq(renterInvitations.id, inviteRow.id));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to withdraw invitation", error);
    return NextResponse.json(
      { error: "Failed to withdraw invitation. Please try again." },
      { status: 500 }
    );
  }
}



