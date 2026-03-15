
-- Fix profiles SELECT policy to allow all authenticated users to view profiles (needed for friend system)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add UPDATE policy for trainings so users can change visibility
DROP POLICY IF EXISTS "Users can update own trainings" ON public.trainings;
CREATE POLICY "Users can update own trainings"
  ON public.trainings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
