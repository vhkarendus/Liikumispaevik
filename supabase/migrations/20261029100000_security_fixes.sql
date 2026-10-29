-- Security fixes for friendships, profiles, history tables and friend code search.

-- Friendships ---------------------------------------------------------------

-- Only known statuses are allowed (NOT VALID: existing rows are not re-checked)
ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted')) NOT VALID;

-- New requests must be pending and cannot be sent to yourself
DROP POLICY IF EXISTS "Users can insert friendship requests" ON public.friendships;
CREATE POLICY "Users can insert friendship requests"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND requester_id <> addressee_id
    AND status = 'pending'
  );

-- Only the addressee can accept a request
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
CREATE POLICY "Addressee can accept friendship requests"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id AND status = 'accepted');

-- Only the status column may be updated, so participants cannot be swapped
REVOKE UPDATE ON public.friendships FROM anon, authenticated;
GRANT UPDATE (status) ON public.friendships TO authenticated;

-- Profiles ------------------------------------------------------------------

-- Users can see their own profile and profiles of people they have a
-- friendship (or pending request) with. Finding new friends goes through
-- search_friend_code.
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own and connected profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = profiles.user_id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.user_id)
    )
  );

-- Friend code search: exact match only, logged-in users only ----------------

CREATE OR REPLACE FUNCTION public.search_friend_code(p_code TEXT)
RETURNS TABLE(user_id UUID, username TEXT, friend_code TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.friend_code, p.avatar_url
  FROM public.profiles p
  WHERE p.friend_code = UPPER(TRIM(p_code))
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.search_friend_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_friend_code(TEXT) TO authenticated;

-- History tables: entries only for your own trainings / periods -------------

DROP POLICY IF EXISTS "Users can insert own training history" ON public.training_history;
CREATE POLICY "Users can insert own training history"
  ON public.training_history FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own period history" ON public.period_history;
CREATE POLICY "Users can insert own period history"
  ON public.period_history FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.training_groups g
      WHERE g.id = period_id AND g.user_id = auth.uid()
    )
  );
