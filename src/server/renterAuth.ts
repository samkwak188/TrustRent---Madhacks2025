import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { renterSessions, renters } from "./db/schema";

const RENTER_SESSION_COOKIE = "clearmove-renter-token";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function findRenterByEmail(email: string) {
  const rows = await db
    .select()
    .from(renters)
    .where(eq(renters.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRenterAccount(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  apartmentName: string;
  unitNumber: string;
  companyId?: string;
  moveInDate?: string;
  moveOutDate?: string;
}) {
  const existing = await findRenterByEmail(params.email);
  if (existing) {
    throw new Error("A renter with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(params.password, 10);
  const renterId = randomUUID();
  await db.insert(renters).values({
    id: renterId,
    fullName: params.fullName.trim(),
    email: params.email.toLowerCase(),
    passwordHash,
    phone: params.phone?.trim() || null,
    apartmentName: params.apartmentName.trim(),
    unitNumber: params.unitNumber.trim(),
    companyId: params.companyId || null,
    moveInDate: params.moveInDate || null,
    moveOutDate: params.moveOutDate || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await createRenterSession(renterId);
  return { id: renterId, email: params.email.toLowerCase() };
}

export async function loginRenter(email: string, password: string) {
  const renter = await findRenterByEmail(email);
  if (!renter) {
    throw new Error("Invalid email or password.");
  }
  if (!renter.passwordHash) {
    throw new Error("Invalid email or password.");
  }
  const valid = await bcrypt.compare(password, renter.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }
  await createRenterSession(renter.id);
  return {
    id: renter.id,
    email: renter.email,
    fullName: renter.fullName,
    apartmentName: renter.apartmentName,
    unitNumber: renter.unitNumber,
  };
}

async function createRenterSession(renterId: string) {
  // Delete all existing sessions for this renter (enforce single session per renter)
  await db.delete(renterSessions).where(eq(renterSessions.renterId, renterId));

  const token = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(renterSessions).values({
    id: randomUUID(),
    renterId,
    token,
    createdAt: Date.now(),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set({
    name: RENTER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: IS_PRODUCTION,
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getRenterFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RENTER_SESSION_COOKIE)?.value;
  if (!token) return null;
  
  const rows = await db
    .select({
      sessionId: renterSessions.id,
      expiresAt: renterSessions.expiresAt,
      renter: renters,
    })
    .from(renterSessions)
    .innerJoin(renters, eq(renterSessions.renterId, renters.id))
    .where(eq(renterSessions.token, token))
    .limit(1);
  
  const row = rows[0];
  if (!row) {
    return null;
  }
  if (row.expiresAt < Date.now()) {
    await db.delete(renterSessions).where(eq(renterSessions.id, row.sessionId));
    cookieStore.delete({
      name: RENTER_SESSION_COOKIE,
      path: "/",
    });
    return null;
  }
  
  return {
    id: row.renter.id,
    email: row.renter.email,
    fullName: row.renter.fullName,
    apartmentName: row.renter.apartmentName,
    unitNumber: row.renter.unitNumber,
    moveInDate: row.renter.moveInDate,
    moveOutDate: row.renter.moveOutDate,
  };
}

export async function requireRenterSession() {
  const renter = await getRenterFromSession();
  if (!renter) {
    throw new Error("Not authenticated");
  }
  return renter;
}

export async function clearRenterSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RENTER_SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(renterSessions).where(eq(renterSessions.token, token));
  }
  cookieStore.delete({
    name: RENTER_SESSION_COOKIE,
    path: "/",
  });
}

