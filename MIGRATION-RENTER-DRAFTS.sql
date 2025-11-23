-- Renter drafts table: persists in-progress checklist/photos/lease per renter
-- Run this in Supabase SQL Editor for your database.

CREATE TABLE IF NOT EXISTS renter_drafts (
  renter_id uuid PRIMARY KEY REFERENCES renters(id) ON DELETE CASCADE,
  draft_json text NOT NULL,
  updated_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

