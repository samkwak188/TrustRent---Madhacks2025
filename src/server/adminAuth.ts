import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { adminSessions, adminUsers } from "./db/schema";

const ADMIN_SESSION_COOKIE = "clearmove-admin-token";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const IS_PRODUCTION = process.env.NODE_ENV === "production";

async function findAdminByEmail(email: string) {
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminUser(email: string, password: string) {
  const existing = await findAdminByEmail(email);
  if (existing) {
    throw new Error("An admin with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const adminId = randomUUID();
  await db.insert(adminUsers).values({
    id: adminId,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: Date.now(),
  });

  await createAdminSession(adminId);
  return { id: adminId, email: email.toLowerCase() };
}

export async function loginAdminUser(email: string, password: string) {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new Error("Invalid email or password.");
  }
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }
  await createAdminSession(admin.id);
  return { id: admin.id, email: admin.email };
}

async function createAdminSession(adminId: string) {
  // Delete all existing sessions for this admin (enforce single session per admin)
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));

  const token = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(adminSessions).values({
    id: randomUUID(),
    adminId,
    token,
    createdAt: Date.now(),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: IS_PRODUCTION,
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getAdminFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      sessionId: adminSessions.id,
      expiresAt: adminSessions.expiresAt,
      admin: adminUsers,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
    .where(eq(adminSessions.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  if (row.expiresAt < Date.now()) {
    await db.delete(adminSessions).where(eq(adminSessions.id, row.sessionId));
    cookieStore.delete({
      name: ADMIN_SESSION_COOKIE,
      path: "/",
    });
    return null;
  }
  return {
    id: row.admin.id,
    email: row.admin.email,
  };
}

export async function requireAdminSession() {
  const admin = await getAdminFromSession();
  if (!admin) {
    throw new Error("Not authenticated");
  }
  return admin;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
  }
  cookieStore.delete({
    name: ADMIN_SESSION_COOKIE,
    path: "/",
  });
}

