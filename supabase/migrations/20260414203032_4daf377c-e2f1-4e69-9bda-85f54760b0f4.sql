
-- Add deleted_at to trainings
ALTER TABLE public.trainings ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Add deleted_at to training_groups
ALTER TABLE public.training_groups ADD COLUMN deleted_at timestamptz DEFAULT NULL;
