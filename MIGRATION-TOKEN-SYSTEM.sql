-- Migration: Switch from complex invite links to simple token system
-- Run this in Supabase SQL Editor

-- 1. Add new columns to renter_invitations
ALTER TABLE renter_invitations 
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS activated_at BIGINT;

-- 2. Drop old columns (after backing up if needed)
ALTER TABLE renter_invitations 
  DROP COLUMN IF EXISTS invite_code,
  DROP COLUMN IF EXISTS invite_token;

-- 3. Make access_token NOT NULL after migration
-- (First, populate existing rows if any)
UPDATE renter_invitations 
SET access_token = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE access_token IS NULL;

ALTER TABLE renter_invitations 
  ALTER COLUMN access_token SET NOT NULL;

-- 4. Create unique index on access_token
CREATE UNIQUE INDEX IF NOT EXISTS renter_access_token_unique 
  ON renter_invitations(access_token);

-- 5. Drop old indexes
DROP INDEX IF EXISTS renter_invite_code_unique;
DROP INDEX IF EXISTS renter_invite_token_unique;

-- 6. Add access_token to renters table (to link back to invitation)
ALTER TABLE renters 
  ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Done! Now restart your app with the new code.

