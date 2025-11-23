import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromSession } from "@/server/adminAuth";
import { sendInvitesForUnit } from "@/server/portfolioManager";
import { db } from "@/server/db/client";
import { rentalCompanies, rentalUnits, apartmentBuildings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const schema = z.object({
  unitId: z.string().min(1, "Unit ID required"),
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
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get company name for this admin
    const companies = await db
      .select()
      .from(rentalCompanies)
      .where(eq(rentalCompanies.adminId, admin.id))
      .limit(1);

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No company found for this admin" },
        { status: 404 }
      );
    }

    // Verify unit belongs to this admin's company
    const unit = (
      await db
        .select({ unitId: rentalUnits.id, companyId: apartmentBuildings.companyId })
        .from(rentalUnits)
        .innerJoin(
          apartmentBuildings,
          eq(rentalUnits.apartmentId, apartmentBuildings.id)
        )
        .where(eq(rentalUnits.id, parsed.data.unitId))
        .limit(1)
    )[0];

    if (!unit || unit.companyId !== companies[0].id) {
      return NextResponse.json(
        { error: "Unit not found or access denied" },
        { status: 403 }
      );
    }

    const result = await sendInvitesForUnit(
      parsed.data.unitId,
      companies[0].name
    );

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Failed to send invites", error);
    return NextResponse.json(
      { error: "Failed to send invites. Please try again." },
      { status: 500 }
    );
  }
}


