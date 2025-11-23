import { eq, desc, asc, and } from "drizzle-orm";
import { db } from "./db/client";
import {
  rentalCompanies,
  apartmentBuildings,
  rentalUnits,
  renterInvitations,
  renters,
  submissions,
} from "./db/schema";

export type PendingInvitation = {
  invitationId: string;
  renterName: string;
  renterEmail: string;
  unitNumber: string;
  accessToken: string; // Simple 6-digit token
  status: string;
  createdAt: number;
};

export type ActiveRenter = {
  renterId: string;
  fullName: string;
  email: string;
  phone: string | null;
  unitNumber: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  submission: {
    submissionId: string;
    fileName: string;
    submittedAt: number;
    pdfSize: number | null;
    downloadPath: string;
  } | null;
};

export type ApartmentDashboard = {
  apartmentId: string;
  apartmentName: string;
  postalCode: string;
  pendingInvitations: PendingInvitation[];
  pastInvitations: PendingInvitation[];
  activeRenters: ActiveRenter[];
};

export async function getAdminDashboard(adminId: string): Promise<{
  companyName: string | null;
  apartments: ApartmentDashboard[];
}> {
  // Get all companies owned by this admin
  const companies = await db
    .select()
    .from(rentalCompanies)
    .where(eq(rentalCompanies.adminId, adminId));

  if (companies.length === 0) {
    return { companyName: null, apartments: [] };
  }

  const companyId = companies[0].id;
  const companyName = companies[0].name;

  // Get all apartments for this company
  const apartmentRecords = await db
    .select()
    .from(apartmentBuildings)
    .where(eq(apartmentBuildings.companyId, companyId))
    .orderBy(asc(apartmentBuildings.name));

  const apartments: ApartmentDashboard[] = [];

  for (const apt of apartmentRecords) {
    // Get all units in this apartment
    const units = await db
      .select()
      .from(rentalUnits)
      .where(eq(rentalUnits.apartmentId, apt.id));

    const unitIds = units.map((u) => u.id);

    // Get pending invitations (status = 'pending')
    const pendingInvites = unitIds.length
      ? await db
          .select({
            invitationId: renterInvitations.id,
            renterName: renterInvitations.renterName,
            renterEmail: renterInvitations.renterEmail,
            unitNumber: rentalUnits.unitNumber,
            accessToken: renterInvitations.accessToken,
            status: renterInvitations.status,
            createdAt: renterInvitations.createdAt,
          })
          .from(renterInvitations)
          .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
          .where(
            and(
              eq(rentalUnits.apartmentId, apt.id),
              eq(renterInvitations.status, "pending")
            )
          )
          .orderBy(desc(renterInvitations.createdAt))
      : [];

    // Get past invitations (e.g. used tokens)
    const pastInvites = unitIds.length
      ? await db
          .select({
            invitationId: renterInvitations.id,
            renterName: renterInvitations.renterName,
            renterEmail: renterInvitations.renterEmail,
            unitNumber: rentalUnits.unitNumber,
            accessToken: renterInvitations.accessToken,
            status: renterInvitations.status,
            createdAt: renterInvitations.createdAt,
          })
          .from(renterInvitations)
          .innerJoin(rentalUnits, eq(renterInvitations.unitId, rentalUnits.id))
          .where(
            and(
              eq(rentalUnits.apartmentId, apt.id),
              eq(renterInvitations.status, "used")
            )
          )
          .orderBy(desc(renterInvitations.createdAt))
      : [];

    // Get active renters (those who have accepted and possibly submitted)
    const activeRenterRows = await db
      .select({
        renterId: renters.id,
        fullName: renters.fullName,
        email: renters.email,
        phone: renters.phone,
        unitNumber: renters.unitNumber,
        moveInDate: renters.moveInDate,
        moveOutDate: renters.moveOutDate,
        submissionId: submissions.id,
        fileName: submissions.fileName,
        submittedAt: submissions.submittedAt,
        pdfSize: submissions.pdfSize,
      })
      .from(renters)
      .leftJoin(submissions, eq(renters.id, submissions.renterId))
      .where(eq(renters.apartmentName, apt.name))
      // Order renters within each apartment by unit number descending, then name.
      .orderBy(desc(renters.unitNumber), asc(renters.fullName));

    apartments.push({
      apartmentId: apt.id,
      apartmentName: apt.name,
      postalCode: apt.postalCode,
      pendingInvitations: pendingInvites.map((inv) => ({
        invitationId: inv.invitationId,
        renterName: inv.renterName,
        renterEmail: inv.renterEmail,
        unitNumber: inv.unitNumber,
        accessToken: inv.accessToken,
        status: inv.status ?? "pending",
        createdAt: inv.createdAt ?? Date.now(),
      })),
        pastInvitations: pastInvites.map((inv) => ({
          invitationId: inv.invitationId,
          renterName: inv.renterName,
          renterEmail: inv.renterEmail,
          unitNumber: inv.unitNumber,
          accessToken: inv.accessToken,
          status: inv.status ?? "used",
          createdAt: inv.createdAt ?? Date.now(),
        })),
      activeRenters: activeRenterRows.map((r) => ({
        renterId: r.renterId,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        unitNumber: r.unitNumber,
        moveInDate: r.moveInDate,
        moveOutDate: r.moveOutDate,
        submission: r.submissionId
          ? {
              submissionId: r.submissionId,
              fileName: r.fileName ?? "inspection-report.pdf",
              submittedAt: r.submittedAt ?? 0,
              pdfSize: r.pdfSize,
              downloadPath: `/api/renter-submissions/${r.submissionId}/file`,
            }
          : null,
      })),
    });
  }

  return { companyName, apartments };
}

