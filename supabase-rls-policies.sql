-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
--
-- IMPORTANT: You're using Clerk for authentication, NOT Supabase Auth.
-- This means we CANNOT use auth.uid() in RLS policies.
--
-- PROBLEM: Supabase RLS was designed for Supabase Auth, not external auth providers.
-- When using Clerk + Prisma, RLS policies cannot easily access the Clerk user ID.
--
-- SOLUTION OPTIONS:
-- 1. Service Role Key: Use Supabase service_role key (bypasses RLS) - CURRENT APPROACH
-- 2. Custom Claims: Add Clerk user ID to Supabase JWT (complex setup)
-- 3. Disable RLS: Rely on application-level security (your current setup)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CURRENT SITUATION ANALYSIS
-- ----------------------------------------------------------------------------
-- Your app uses:
-- - Clerk for authentication (JWT tokens)
-- - Prisma as ORM connecting to Supabase Postgres
-- - Service role connection (likely) which BYPASSES RLS
--
-- To verify what connection type you're using:
-- Check your DATABASE_URL in .env:
-- - If it contains your service_role key → RLS is BYPASSED
-- - If it contains anon/authenticated key → RLS is ENFORCED
-- ----------------------------------------------------------------------------

-- ============================================================================
-- OPTION 1: DISABLE RLS (Recommended for Clerk + Prisma setup)
-- ============================================================================
-- Since you're using Clerk (not Supabase Auth) and connecting via service_role,
-- RLS policies won't work as intended. Your security is at the application layer.

-- Disable RLS on all tables (if you want to rely on application security)
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RecordTest" DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTION 2: ENABLE RLS WITH SERVICE ROLE BYPASS (Current State)
-- ============================================================================
-- If you enabled RLS but connect with service_role key, RLS is ignored anyway.
-- This gives you false sense of security!

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecordTest" ENABLE ROW LEVEL SECURITY;

-- But since you're using service_role connection, these policies won't apply!
-- Service role bypasses all RLS policies.

-- ============================================================================
-- OPTION 3: PROPER RLS WITH CLERK INTEGRATION (Advanced Setup)
-- ============================================================================
-- To make RLS work with Clerk, you need to:
-- 1. Set up Supabase JWT verification to accept Clerk JWTs
-- 2. Configure Clerk to include user ID in JWT custom claims
-- 3. Use anon/authenticated connection string (not service_role)
-- 4. Create RLS policies using custom claims
--
-- This is COMPLEX and not recommended unless you need database-level security
-- for direct database access (e.g., PostgREST API, direct SQL clients)
-- ============================================================================

-- Example RLS policies IF you set up Clerk JWT integration:
-- (These won't work with your current setup!)

-- Policy for User table
CREATE POLICY "Users can read own data"
ON "User"
FOR SELECT
USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
);

CREATE POLICY "Users can update own data"
ON "User"
FOR UPDATE
USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Policy for Subscription table
CREATE POLICY "Users can read own subscription"
ON "Subscription"
FOR SELECT
USING (
  "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
);

CREATE POLICY "Users can update own subscription"
ON "Subscription"
FOR UPDATE
USING (
  "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Policy for RecordTest table
CREATE POLICY "Users can manage own records"
ON "RecordTest"
FOR ALL
USING (
  "userId" = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- ============================================================================
-- RECOMMENDATION FOR YOUR SETUP
-- ============================================================================
--
-- Given you're using Clerk + Prisma + Service Role connection:
--
-- 1. DISABLE RLS on all tables (Option 1)
--    - Your security is already handled at application layer
--    - RLS adds no value with service_role connection
--    - Reduces confusion and maintenance
--
-- 2. Focus on APPLICATION SECURITY:
--    ✅ Always filter queries by userId from Clerk auth
--    ✅ Validate userId in all API routes
--    ✅ Use TypeScript types to enforce userId parameter
--    ✅ Add integration tests for multi-tenant isolation
--    ✅ Use the SecurityTest component regularly
--
-- 3. ADDITIONAL SECURITY LAYERS:
--    ✅ Keep Clerk middleware on all routes
--    ✅ Add rate limiting to API endpoints
--    ✅ Implement input validation (Zod)
--    ✅ Add audit logging for sensitive operations
--    ✅ Set up monitoring and alerts
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TO APPLY THESE CHANGES:
-- ----------------------------------------------------------------------------
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Choose the option you want (disable RLS recommended)
-- 3. Run the SQL commands
-- ----------------------------------------------------------------------------

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('User', 'Subscription', 'RecordTest');

-- Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('User', 'Subscription', 'RecordTest');

-- Check your current connection role
SELECT current_user, current_database();

-- If current_user is 'service_role', RLS is bypassed!
-- If current_user is 'authenticated' or 'anon', RLS is enforced!
