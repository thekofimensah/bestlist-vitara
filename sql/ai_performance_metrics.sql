-- AI Performance Metrics Table
-- Tracks timing and success/failure of AI image analysis operations

CREATE TABLE IF NOT EXISTS public.ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lookup_time_ms INTEGER NOT NULL DEFAULT 0,
  image_size_bytes INTEGER DEFAULT 0,
  image_format TEXT DEFAULT 'unknown',
  source TEXT DEFAULT 'unknown', -- 'camera', 'gallery'
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  error_code TEXT,
  product_detected BOOLEAN DEFAULT false,
  confidence_score REAL, -- AI confidence score if available
  location TEXT, -- Device location during AI lookup
  platform TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_performance_created_at ON public.ai_performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_performance_user_id ON public.ai_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_success ON public.ai_performance_metrics(success);
CREATE INDEX IF NOT EXISTS idx_ai_performance_source ON public.ai_performance_metrics(source);
CREATE INDEX IF NOT EXISTS idx_ai_performance_lookup_time ON public.ai_performance_metrics(lookup_time_ms);

-- Enable Row Level Security
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  -- Allow users to read all AI performance data (for analytics)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_performance_metrics' AND policyname='ai_performance_select_all'
  ) THEN
    CREATE POLICY ai_performance_select_all ON public.ai_performance_metrics 
      FOR SELECT USING (true);
  END IF;
  
  -- Allow authenticated users to insert their own AI performance data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_performance_metrics' AND policyname='ai_performance_insert_own'
  ) THEN
    CREATE POLICY ai_performance_insert_own ON public.ai_performance_metrics
      FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);
  END IF;
END $$;
