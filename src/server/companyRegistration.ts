import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import {
  apartmentBuildings,
  rentalCompanies,
  rentalUnits,
  renterInvitations,
} from "./db/schema";
import { upsertRenter } from "./renterSubmissions";
import { sendInvitationEmail } from "./email";

type TransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
type SqlClient = typeof db | TransactionClient;

const baseAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  "http://localhost:3000";

const normalizedBaseUrl = baseAppUrl.replace(/\/$/, "");

export type CompanyRegistrationInput = {
  companyName: string;
  contactEmail?: string | null;
  apartments: Array<{
    name: string;
    postalCode: string;
    units: Array<{
      unitNumber: string;
      renters: Array<{
        fullName: string;
        email: string;
      }>;
    }>;
  }>;
};

export type InvitationPreview = {
  invitationId: string;
  renterName: string;
  renterEmail: string;
  apartmentName: string;
  unitNumber: string;
  inviteCode: string;
  inviteUrl: string;
};

type InvitationRecord = {
  invitationId: string;
  renterName: string;
  renterEmail: string;
  inviteCode: string;
  inviteToken: string;
  status: string;
  unitNumber: string;
  apartmentName: string;
  postalCode: string;
  companyName: string;
  companyId: string;
};

function buildInviteUrl(token: string) {
  return `${normalizedBaseUrl}/register?token=${token}`;
}

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function reserveInviteCode(tx: SqlClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await tx
      .select({ id: renterInvitations.id })
      .from(renterInvitations)
      .where(eq(renterInvitations.inviteCode, code));
    if (existing.length === 0) {
      return code;
    }
  }
  throw new Error(
    "Unable to allocate a unique invitation code. Please try again."
  );
}

function simulateInvitationEmail(invite: InvitationPreview) {
  // eslint-disable-next-line no-console
  console.log(
    [
      "------------------------------",
      "TrustRent Invitation Preview",
      `To: ${invite.renterEmail}`,
      `Renter: ${invite.renterName}`,
      `Apartment: ${invite.apartmentName}`,
      `Unit: ${invite.unitNumber}`,
      `One-time code: ${invite.inviteCode}`,
      `Link: ${invite.inviteUrl}`,
      "------------------------------",
    ].join("\n")
  );
}

export async function registerRentalCompany(
  payload: CompanyRegistrationInput,
  adminId: string
): Promise<{ companyId: string; invitations: InvitationPreview[] }> {
  const now = Date.now();
  const invitations: InvitationPreview[] = [];
  const trimmedCompanyName = payload.companyName.trim();
  if (!trimmedCompanyName) {
    throw new Error("Company name is required");
  }

  const companyId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(rentalCompanies).values({
      id: companyId,
      name: trimmedCompanyName,
      contactEmail: payload.contactEmail?.trim() || null,
      adminId,
      createdAt: now,
    });

    for (const apartment of payload.apartments) {
      const apartmentName = apartment.name.trim();
      const apartmentId = randomUUID();
      await tx.insert(apartmentBuildings).values({
        id: apartmentId,
        companyId,
        name: apartmentName,
        postalCode: apartment.postalCode.trim(),
        createdAt: now,
      });

      for (const unit of apartment.units) {
        const unitId = randomUUID();
        const unitNumber = unit.unitNumber.trim();
        await tx.insert(rentalUnits).values({
          id: unitId,
          apartmentId,
          unitNumber,
          createdAt: now,
        });

        for (const renter of unit.renters) {
          const invitationId = randomUUID();
          const inviteToken = randomUUID();
          const inviteCode = await reserveInviteCode(tx);
          const renterName = renter.fullName.trim();
          const renterEmail = renter.email.trim().toLowerCase();

          await tx.insert(renterInvitations).values({
            id: invitationId,
            unitId,
            renterName,
            renterEmail,
            inviteCode,
            inviteToken,
            status: "pending",
            createdAt: now,
          });

          invitations.push({
            invitationId,
            renterName,
            renterEmail,
            apartmentName,
            unitNumber,
            inviteCode,
            inviteUrl: buildInviteUrl(inviteToken),
          });
        }
      }
    }
  });

  invitations.forEach(simulateInvitationEmail);

  await Promise.all(
    invitations.map((invite) =>
      sendInvitationEmail({
        renterName: invite.renterName,
        renterEmail: invite.renterEmail,
        companyName: trimmedCompanyName,
        apartmentName: invite.apartmentName,
        unitNumber: invite.unitNumber,
        inviteCode: invite.inviteCode,
        inviteUrl: invite.inviteUrl,
      })
    )
  );

  return { companyId, invitations };
}

async function fetchInvitationRecordByToken(
  token: string
): Promise<InvitationRecord | null> {
  if (!token || token.trim().length === 0) return null;
  const rows = await db
    .select({
      invitationId: renterInvitations.id,
      renterName: renterInvitations.renterName,
      renterEmail: renterInvitations.renterEmail,
      inviteCode: renterInvitations.inviteCode,
      inviteToken: renterInvitations.inviteToken,
      status: renterInvitations.status,
      unitNumber: rentalUnits.unitNumber,
      apartmentName: apartmentBuildings.name,
      postalCode: apartmentBuildings.postalCode,
      companyName: rentalCompanies.name,
      companyId: rentalCompanies.id,
    })
    .from(renterInvitations)
    .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
    .innerJoin(
      apartmentBuildings,
      eq(rentalUnits.apartmentId, apartmentBuildings.id)
    )
    .innerJoin(
      rentalCompanies,
      eq(apartmentBuildings.companyId, rentalCompanies.id)
    )
    .where(eq(renterInvitations.inviteToken, token.trim()))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function getInvitationPreview(token: string) {
  const record = await fetchInvitationRecordByToken(token);
  if (!record) return null;
  return {
    invitationId: record.invitationId,
    renterName: record.renterName,
    renterEmail: record.renterEmail,
    apartmentName: record.apartmentName,
    unitNumber: record.unitNumber,
    postalCode: record.postalCode,
    companyName: record.companyName,
    status: record.status,
    inviteCode: record.inviteCode,
    companyId: record.companyId,
  };
}

const normalize = (value: string) => value.trim().toLowerCase();

export async function acceptInvitationAndCreateAccount(params: {
  token: string;
  inviteCode: string;
  fullName: string;
  apartmentName: string;
  unitNumber: string;
  password: string;
}) {
  const record = await fetchInvitationRecordByToken(params.token);
  if (!record) {
    throw new Error(
      "Invitation not found. Double-check the link from your property manager."
    );
  }
  if (record.status !== "pending") {
    throw new Error(
      "This invitation code has already been used. Contact your property manager if you need a new link."
    );
  }

  if (record.inviteCode !== params.inviteCode.trim()) {
    throw new Error("The verification code does not match our records.");
  }

  if (normalize(record.apartmentName) !== normalize(params.apartmentName)) {
    throw new Error(
      "Apartment name does not match the invitation. Please check for typos."
    );
  }

  if (normalize(record.unitNumber) !== normalize(params.unitNumber)) {
    throw new Error(
      "Unit number does not match the invitation. Please check for typos."
    );
  }

  if (normalize(record.renterName) !== normalize(params.fullName)) {
    throw new Error(
      "The name entered does not match the name on file. Contact your property manager if this is unexpected."
    );
  }

  const { createRenterAccount } = await import("./renterAuth");
  
  const acceptedAt = Date.now();

  await db
    .update(renterInvitations)
    .set({
      status: "accepted",
      acceptedAt,
      renterName: params.fullName.trim(),
    })
    .where(eq(renterInvitations.id, record.invitationId));

  const renter = await createRenterAccount({
    email: record.renterEmail,
    password: params.password,
    fullName: params.fullName.trim(),
    apartmentName: record.apartmentName,
    unitNumber: record.unitNumber,
    companyId: record.companyId,
  });

  return {
    renterId: renter.id,
    renterEmail: renter.email,
    renterName: params.fullName.trim(),
    apartmentName: record.apartmentName,
    unitNumber: record.unitNumber,
  };
}

