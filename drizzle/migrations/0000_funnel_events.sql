CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  event text NOT NULL,
  path text,
  product_id text,
  product_name text,
  value numeric,
  items jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.funnel_events TO service_role;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX funnel_events_created_idx ON public.funnel_events (created_at DESC);
CREATE INDEX funnel_events_visitor_idx ON public.funnel_events (visitor_id, created_at DESC);