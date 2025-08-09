-- 1) Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_foreground_seconds INTEGER NOT NULL DEFAULT 0,
  total_active_seconds INTEGER NOT NULL DEFAULT 0,
  platform TEXT,
  os_version TEXT,
  app_version TEXT,
  device_model TEXT,
  is_virtual BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);

-- 3) Updated-at trigger (optional but recommended)
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON public.user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- 4) RLS (needed so the app can write its own rows)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_select_own'
  ) THEN
    CREATE POLICY user_sessions_select_own ON public.user_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_insert_own'
  ) THEN
    CREATE POLICY user_sessions_insert_own ON public.user_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_update_own'
  ) THEN
    CREATE POLICY user_sessions_update_own ON public.user_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;