-- =====================================================
-- PUSH NOTIFICATIONS: user_push_tokens table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Required for: Settings → Push notification (broadcast to all app users)
-- =====================================================

-- Create table for storing push notification tokens (from the mobile app)
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own tokens (app saves token on login)
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.user_push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Admins can view all tokens (optional; only if user_roles exists)
DROP POLICY IF EXISTS "Admins can view all push tokens" ON public.user_push_tokens;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    EXECUTE 'CREATE POLICY "Admins can view all push tokens"
      ON public.user_push_tokens FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = ''admin''
      ))';
  END IF;
END $$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON public.user_push_tokens(user_id);

-- Optional: trigger to keep updated_at in sync (requires update_updated_at_column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON public.user_push_tokens;
    CREATE TRIGGER update_push_tokens_updated_at
      BEFORE UPDATE ON public.user_push_tokens
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- Done. Deploy edge function: send-broadcast-notification
-- (from mobile app repo: supabase functions deploy send-broadcast-notification)
-- =====================================================
