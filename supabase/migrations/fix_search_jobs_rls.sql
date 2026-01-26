-- Fix RLS policy to allow backend service to create jobs
-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create search jobs" ON search_jobs;

-- Create new policy that allows:
-- 1. Authenticated users creating jobs for themselves
-- 2. Service (anon key) creating jobs for any user (backend API)
CREATE POLICY "Allow job creation"
  ON search_jobs FOR INSERT
  WITH CHECK (
    -- Allow if authenticated user is creating their own job
    (auth.uid() = user_id)
    OR
    -- Allow if no auth.uid (service/backend creating on behalf of user)
    (auth.uid() IS NULL)
  );
