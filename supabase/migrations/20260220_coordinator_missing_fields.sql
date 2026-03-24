ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mode text check (mode in ('online', 'offline')) default 'offline';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

ALTER TABLE public.results ADD COLUMN IF NOT EXISTS prize text;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS is_reviewed boolean default false;
