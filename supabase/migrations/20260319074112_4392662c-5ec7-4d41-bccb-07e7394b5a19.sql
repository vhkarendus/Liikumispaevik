ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS effort_type text DEFAULT NULL;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS effort_value integer DEFAULT NULL;