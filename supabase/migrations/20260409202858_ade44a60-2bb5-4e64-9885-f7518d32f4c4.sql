
-- Training history table for version tracking
CREATE TABLE public.training_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  duration INTEGER NOT NULL,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'friends',
  effort_type TEXT,
  effort_value INTEGER,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training history"
ON public.training_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training history"
ON public.training_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training history"
ON public.training_history FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to update their own training groups (period editing)
CREATE POLICY "Users can update own groups"
ON public.training_groups FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
