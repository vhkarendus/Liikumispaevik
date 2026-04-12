
CREATE TABLE public.period_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.period_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own period history" ON public.period_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own period history" ON public.period_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own period history" ON public.period_history FOR DELETE USING (auth.uid() = user_id);
