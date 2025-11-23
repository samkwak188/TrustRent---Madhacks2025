import {
  pgTable,
  text,
  uuid,
  bigint,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Helper for millisecond timestamps stored as BIGINT
const nowMs = () => sql`(extract(epoch from now()) * 1000)::bigint`;

// ---------------------------------------------------------------------------
// Core company / building / unit tables
// ---------------------------------------------------------------------------

export const rentalCompanies = pgTable("rental_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  adminId: uuid("admin_id"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});

export const apartmentBuildings = pgTable("apartment_buildings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => rentalCompanies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  postalCode: text("postal_code").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});

export const rentalUnits = pgTable("rental_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  apartmentId: uuid("apartment_id")
    .notNull()
    .references(() => apartmentBuildings.id, { onDelete: "cascade" }),
  unitNumber: text("unit_number").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});

// ---------------------------------------------------------------------------
// Invitation workflow
// ---------------------------------------------------------------------------

export const renterInvitations = pgTable("renter_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => rentalUnits.id, { onDelete: "cascade" }),
  renterName: text("renter_name").notNull(),
  renterEmail: text("renter_email").notNull(),
  accessToken: text("access_token").notNull(), // Simple 6-digit token
  status: text("status").notNull().default("pending"), // pending, activated, used
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
  activatedAt: bigint("activated_at", { mode: "number" }), // When renter first uses the token
});

// ---------------------------------------------------------------------------
// Renter profiles + submissions
// ---------------------------------------------------------------------------

export const renters = pgTable("renters", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  apartmentName: text("apartment_name").notNull(),
  unitNumber: text("unit_number").notNull(),
  companyId: uuid("company_id"),
  accessToken: text("access_token"), // Link back to the invitation token they used
  moveInDate: text("move_in_date"),
  moveOutDate: text("move_out_date"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  renterId: uuid("renter_id")
    .notNull()
    .references(() => renters.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  pdfData: text("pdf_data").notNull(), // Store as base64 text for Postgres compatibility
  pdfSize: integer("pdf_size").notNull(),
  submittedAt: bigint("submitted_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
  moveInDate: text("move_in_date"),
  moveOutDate: text("move_out_date"),
});

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Renter auth sessions
// ---------------------------------------------------------------------------

export const renterSessions = pgTable("renter_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  renterId: uuid("renter_id")
    .notNull()
    .references(() => renters.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Renter draft checklist / lease state (optional, separate from final PDF)
// ---------------------------------------------------------------------------

export const renterDrafts = pgTable("renter_drafts", {
  renterId: uuid("renter_id")
    .primaryKey()
    .references(() => renters.id, { onDelete: "cascade" }),
  draftJson: text("draft_json").notNull(), // JSON string with checklist + photos + lease analysis
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(nowMs()),
});



