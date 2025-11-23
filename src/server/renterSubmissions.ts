import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { renters, submissions, rentalCompanies } from "./db/schema";

export type RenterProfileInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  apartmentName: string;
  unitNumber: string;
  moveInDate?: string | null;
  moveOutDate?: string | null;
  companyId?: string | null;
};

export async function upsertRenter(profile: RenterProfileInput) {
  const now = Date.now();
  const existing = (
    await db
      .select()
      .from(renters)
      .where(
        and(
          eq(renters.email, profile.email),
          eq(renters.apartmentName, profile.apartmentName),
          eq(renters.unitNumber, profile.unitNumber)
        )
      )
  )[0];

  if (existing) {
    await db
      .update(renters)
      .set({
        fullName: profile.fullName,
        phone: profile.phone ?? null,
        moveInDate: profile.moveInDate ?? null,
        moveOutDate: profile.moveOutDate ?? null,
        companyId: profile.companyId ?? existing.companyId ?? null,
        updatedAt: now,
      })
      .where(eq(renters.id, existing.id));
    return { ...existing, ...profile, updatedAt: now };
  }

  const id = randomUUID();
  await db.insert(renters).values({
    id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? null,
    apartmentName: profile.apartmentName,
    unitNumber: profile.unitNumber,
    companyId: profile.companyId ?? null,
    moveInDate: profile.moveInDate ?? null,
    moveOutDate: profile.moveOutDate ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, ...profile, createdAt: now, updatedAt: now };
}

export async function upsertSubmission(params: {
  renterId: string;
  fileName: string;
  mimeType: string;
  pdfData: Buffer;
  moveInDate?: string | null;
  moveOutDate?: string | null;
}) {
  const now = Date.now();
  const existing = (
    await db
      .select()
      .from(submissions)
      .where(eq(submissions.renterId, params.renterId))
  )[0];

  const pdfBase64 = params.pdfData.toString("base64");

  if (existing) {
    await db
      .update(submissions)
      .set({
        fileName: params.fileName,
        mimeType: params.mimeType,
        pdfData: pdfBase64,
        pdfSize: params.pdfData.byteLength,
        submittedAt: now,
        moveInDate: params.moveInDate ?? null,
        moveOutDate: params.moveOutDate ?? null,
      })
      .where(eq(submissions.id, existing.id));
    return { ...existing, submittedAt: now };
  }

  const id = randomUUID();
  await db.insert(submissions).values({
    id,
    renterId: params.renterId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    pdfData: pdfBase64,
    pdfSize: params.pdfData.byteLength,
    submittedAt: now,
    moveInDate: params.moveInDate ?? null,
    moveOutDate: params.moveOutDate ?? null,
  });
  return { id, submittedAt: now };
}

export async function listRenterRows(adminId?: string) {
  let query = db
    .select({
      renterId: renters.id,
      fullName: renters.fullName,
      email: renters.email,
      phone: renters.phone,
      apartmentName: renters.apartmentName,
      unitNumber: renters.unitNumber,
      moveInDate: renters.moveInDate,
      moveOutDate: renters.moveOutDate,
      submissionId: submissions.id,
      fileName: submissions.fileName,
      submittedAt: submissions.submittedAt,
      pdfSize: submissions.pdfSize,
      companyName: rentalCompanies.name,
      companyAdminId: rentalCompanies.adminId,
    })
    .from(renters)
    .leftJoin(submissions, eq(renters.id, submissions.renterId))
    .leftJoin(rentalCompanies, eq(renters.companyId, rentalCompanies.id));

  if (adminId) {
    query = query.where(eq(rentalCompanies.adminId, adminId));
  }

  const rows = await query.orderBy(
    asc(renters.apartmentName),
    asc(renters.unitNumber),
    asc(renters.fullName)
  );

  return rows;
}

export async function findSubmission(submissionId: string) {
  const row = (
    await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
  )[0];
  return row || null;
}

