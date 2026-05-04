
ALTER TABLE public.tenants 
ADD COLUMN trial_ends_at timestamp with time zone DEFAULT (now() + interval '30 days'),
ADD COLUMN is_trial boolean NOT NULL DEFAULT true;
