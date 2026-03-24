ALTER TABLE public.events ADD COLUMN IF NOT EXISTS budget_request numeric DEFAULT 0;  
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_certificate_enabled boolean DEFAULT false;  
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS admin_remarks text; 
