import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { renterDrafts } from "./db/schema";

export type RenterDraftSnapshot = {
  state: any;
  checklistImagePreview: string | null;
  leaseFileName: string | null;
  leaseAnalysis: any | null;
};

export async function saveRenterDraft(
  renterId: string,
  snapshot: RenterDraftSnapshot
) {
  const now = Date.now();
  const draftJson = JSON.stringify(snapshot);

  const existing = await db
    .select()
    .from(renterDrafts)
    .where(eq(renterDrafts.renterId, renterId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(renterDrafts)
      .set({ draftJson, updatedAt: now })
      .where(eq(renterDrafts.renterId, renterId));
  } else {
    await db.insert(renterDrafts).values({
      renterId,
      draftJson,
      updatedAt: now,
    });
  }
}

export async function getRenterDraft(
  renterId: string
): Promise<RenterDraftSnapshot | null> {
  const rows = await db
    .select()
    .from(renterDrafts)
    .where(eq(renterDrafts.renterId, renterId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  try {
    const parsed = JSON.parse(row.draftJson) as RenterDraftSnapshot;
    return parsed;
  } catch {
    return null;
  }
}



