import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db/client";
import {
  rentalCompanies,
  apartmentBuildings,
  rentalUnits,
  renterInvitations,
} from "./db/schema";
import { sendInvitationEmail } from "./email";

// No longer need invite URLs - renters use tokens directly on the access page

function generateAccessToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function reserveAccessToken(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const token = generateAccessToken();
    const existing = await db
      .select({ id: renterInvitations.id })
      .from(renterInvitations)
      .where(eq(renterInvitations.accessToken, token));
    if (existing.length === 0) {
      return token;
    }
  }
  throw new Error("Unable to allocate a unique access token. Please try again.");
}

export type RenterInput = {
  id: string;
  fullName: string;
  email: string;
};

export type UnitInput = {
  id: string;
  unitNumber: string;
  renters: RenterInput[];
};

export type ApartmentInput = {
  id: string;
  name: string;
  postalCode: string;
  units: UnitInput[];
};

export type SavePortfolioInput = {
  companyName: string;
  contactEmail?: string;
  apartments: ApartmentInput[];
};

export async function savePortfolio(
  adminId: string,
  payload: SavePortfolioInput
): Promise<{ companyId: string; success: boolean }> {
  const trimmedCompanyName = payload.companyName.trim();
  if (!trimmedCompanyName) {
    throw new Error("Company name is required");
  }

  // Check if company already exists for this admin
  const existingCompany = (
    await db
      .select()
      .from(rentalCompanies)
      .where(eq(rentalCompanies.adminId, adminId))
      .limit(1)
  )[0];

  const companyId = existingCompany?.id || randomUUID();
  const now = Date.now();

  await db.transaction(async (tx) => {
    // Upsert company
    if (existingCompany) {
      await tx
        .update(rentalCompanies)
        .set({
          name: trimmedCompanyName,
          contactEmail: payload.contactEmail?.trim() || null,
        })
        .where(eq(rentalCompanies.id, companyId));
    } else {
      await tx.insert(rentalCompanies).values({
        id: companyId,
        name: trimmedCompanyName,
        contactEmail: payload.contactEmail?.trim() || null,
        adminId,
        createdAt: now,
      });
    }

    // Get existing apartments for this company
    const existingApartments = await tx
      .select()
      .from(apartmentBuildings)
      .where(eq(apartmentBuildings.companyId, companyId));

    const existingAptIds = new Set(existingApartments.map((a) => a.id));
    const payloadAptIds = new Set(payload.apartments.map((a) => a.id));

    // Delete apartments not in payload
    for (const apt of existingApartments) {
      if (!payloadAptIds.has(apt.id)) {
        await tx
          .delete(apartmentBuildings)
          .where(eq(apartmentBuildings.id, apt.id));
      }
    }

    // Upsert each apartment
    for (const apartment of payload.apartments) {
      const apartmentName = apartment.name.trim();
      if (!apartmentName) continue;

      if (existingAptIds.has(apartment.id)) {
        await tx
          .update(apartmentBuildings)
          .set({
            name: apartmentName,
            postalCode: apartment.postalCode.trim(),
          })
          .where(eq(apartmentBuildings.id, apartment.id));
      } else {
        await tx.insert(apartmentBuildings).values({
          id: apartment.id,
          companyId,
          name: apartmentName,
          postalCode: apartment.postalCode.trim(),
          createdAt: now,
        });
      }

      // Get existing units for this apartment
      const existingUnits = await tx
        .select()
        .from(rentalUnits)
        .where(eq(rentalUnits.apartmentId, apartment.id));

      const existingUnitIds = new Set(existingUnits.map((u) => u.id));
      const payloadUnitIds = new Set(apartment.units.map((u) => u.id));

      // Delete units not in payload
      for (const unit of existingUnits) {
        if (!payloadUnitIds.has(unit.id)) {
          await tx.delete(rentalUnits).where(eq(rentalUnits.id, unit.id));
        }
      }

      // Upsert each unit
      for (const unit of apartment.units) {
        const unitNumber = unit.unitNumber.trim();
        if (!unitNumber) continue;

        if (existingUnitIds.has(unit.id)) {
          await tx
            .update(rentalUnits)
            .set({ unitNumber })
            .where(eq(rentalUnits.id, unit.id));
        } else {
          await tx.insert(rentalUnits).values({
            id: unit.id,
            apartmentId: apartment.id,
            unitNumber,
            createdAt: now,
          });
        }

        // Get existing invitations for this unit
        const existingInvites = await tx
          .select()
          .from(renterInvitations)
          .where(eq(renterInvitations.unitId, unit.id));

        const existingEmails = new Map(
          existingInvites.map((inv) => [inv.renterEmail.toLowerCase(), inv])
        );

        const payloadEmails = new Set(
          unit.renters.map((r) => r.email.trim().toLowerCase())
        );

        // Delete invitations for renters no longer in payload
        for (const inv of existingInvites) {
          if (!payloadEmails.has(inv.renterEmail.toLowerCase())) {
            await tx
              .delete(renterInvitations)
              .where(eq(renterInvitations.id, inv.id));
          }
        }

        // Upsert each renter invitation (but don't auto-send emails here)
        for (const renter of unit.renters) {
          const renterEmail = renter.email.trim().toLowerCase();
          const renterName = renter.fullName.trim();
          if (!renterEmail || !renterName) continue;

          const existingInv = existingEmails.get(renterEmail);
          if (existingInv) {
            // Update name if changed
            await tx
              .update(renterInvitations)
              .set({ renterName })
              .where(eq(renterInvitations.id, existingInv.id));
          } else {
            // Create new invitation with simple access token
            const invitationId = randomUUID();
            const accessToken = await reserveAccessToken();

            await tx.insert(renterInvitations).values({
              id: invitationId,
              unitId: unit.id,
              renterName,
              renterEmail,
              accessToken,
              status: "pending",
              createdAt: now,
            });
          }
        }
      }
    }
  });

  return { companyId, success: true };
}

export async function sendInvitesForUnit(
  unitId: string,
  companyName: string
): Promise<{ sent: number; failed: number }> {
  console.log(`[sendInvitesForUnit] unitId: ${unitId}, companyName: ${companyName}`);
  
  const invitations = await db
    .select({
      invitationId: renterInvitations.id,
      renterName: renterInvitations.renterName,
      renterEmail: renterInvitations.renterEmail,
      accessToken: renterInvitations.accessToken,
      status: renterInvitations.status,
      unitNumber: rentalUnits.unitNumber,
      apartmentName: apartmentBuildings.name,
    })
    .from(renterInvitations)
    .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
    .innerJoin(
      apartmentBuildings,
      eq(rentalUnits.apartmentId, apartmentBuildings.id)
    )
    .where(
      and(
        eq(renterInvitations.unitId, unitId),
        eq(renterInvitations.status, "pending")
      )
    );

  console.log(`[sendInvitesForUnit] Found ${invitations.length} pending invitations`);
  if (invitations.length === 0) {
    console.log(`[sendInvitesForUnit] No pending invitations to send (they may have been sent already or marked as accepted)`);
  }

  let sent = 0;
  let failed = 0;

  for (const inv of invitations) {
    console.log(`[sendInvitesForUnit] Sending to ${inv.renterEmail}...`);
    const success = await sendInvitationEmail({
      renterName: inv.renterName,
      renterEmail: inv.renterEmail,
      companyName,
      apartmentName: inv.apartmentName,
      unitNumber: inv.unitNumber,
      accessToken: inv.accessToken,
    });
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[sendInvitesForUnit] Result: sent=${sent}, failed=${failed}`);
  return { sent, failed };
}

export async function getPortfolio(adminId: string): Promise<{
  companyName: string;
  contactEmail: string | null;
  apartments: Array<{
    id: string;
    name: string;
    postalCode: string;
    units: Array<{
      id: string;
      unitNumber: string;
      renters: Array<{
        id: string;
        fullName: string;
        email: string;
        inviteStatus: string;
      }>;
    }>;
  }>;
}> {
  const companies = await db
    .select()
    .from(rentalCompanies)
    .where(eq(rentalCompanies.adminId, adminId))
    .limit(1);

  if (companies.length === 0) {
    return { companyName: "", contactEmail: null, apartments: [] };
  }

  const company = companies[0];

  const apartments = await db
    .select()
    .from(apartmentBuildings)
    .where(eq(apartmentBuildings.companyId, company.id));

  const result = [];

  for (const apt of apartments) {
    const units = await db
      .select()
      .from(rentalUnits)
      .where(eq(rentalUnits.apartmentId, apt.id));

    const unitsWithRenters = [];

    for (const unit of units) {
      const invitations = await db
        .select()
        .from(renterInvitations)
        .where(eq(renterInvitations.unitId, unit.id));

      unitsWithRenters.push({
        id: unit.id,
        unitNumber: unit.unitNumber,
        renters: invitations.map((inv) => ({
          id: inv.id,
          fullName: inv.renterName,
          email: inv.renterEmail,
          inviteStatus: inv.status ?? "pending",
          accessToken: inv.accessToken, // Include token for admin to see
        })),
      });
    }

    result.push({
      id: apt.id,
      name: apt.name,
      postalCode: apt.postalCode,
      units: unitsWithRenters,
    });
  }

  return {
    companyName: company.name,
    contactEmail: company.contactEmail,
    apartments: result,
  };
}

