CREATE TABLE IF NOT EXISTS public.error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  component TEXT,
  screen TEXT,
  route TEXT,
  error_name TEXT,
  error_message TEXT,
  error_code TEXT,
  stack TEXT,
  severity TEXT,
  api_endpoint TEXT,
  http_status INTEGER,
  http_method TEXT,
  request_id TEXT,
  platform TEXT,
  os_version TEXT,
  app_version TEXT,
  device_model TEXT,
  is_virtual BOOLEAN,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON public.error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_user_id ON public.error_events(user_id);
CREATE INDEX IF NOT EXISTS idx_error_events_component ON public.error_events(component);
CREATE INDEX IF NOT EXISTS idx_error_events_api ON public.error_events(api_endpoint, http_status);
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='error_events' AND policyname='error_events_select_all'
  ) THEN
    CREATE POLICY error_events_select_all ON public.error_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='error_events' AND policyname='error_events_insert_own'
  ) THEN
    CREATE POLICY error_events_insert_own ON public.error_events
      FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);
  END IF;
END $$;