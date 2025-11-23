-- Cleanup script - run this in Supabase SQL Editor to remove duplicates

-- 1. Check current admin users
SELECT email, COUNT(*) as count FROM admin_users GROUP BY email;

-- 2. Keep only the most recent admin for each email, delete older duplicates
DELETE FROM admin_users 
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(email)) id 
  FROM admin_users 
  ORDER BY LOWER(email), created_at DESC
);

-- 3. Delete all orphaned or expired sessions
DELETE FROM admin_sessions 
WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;

DELETE FROM renter_sessions 
WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;

-- 4. Verify cleanup
SELECT 'Admin users after cleanup:' as info, COUNT(*) as count FROM admin_users;
SELECT 'Active admin sessions:' as info, COUNT(*) as count FROM admin_sessions;
SELECT 'Active renter sessions:' as info, COUNT(*) as count FROM renter_sessions;
