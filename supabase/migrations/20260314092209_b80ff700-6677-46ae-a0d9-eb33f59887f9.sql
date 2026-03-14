
-- Add friend_code and last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Generate unique friend codes for existing profiles
UPDATE public.profiles SET friend_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)) WHERE friend_code IS NULL;

-- Function to generate unique friend code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.friend_code IS NULL THEN
    NEW.friend_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_friend_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_friend_code();

-- Add visibility to trainings
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'friends';

-- Training groups table
CREATE TABLE public.training_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups" ON public.training_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own groups" ON public.training_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON public.training_groups FOR DELETE USING (auth.uid() = user_id);

-- Add group_id to trainings
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.training_groups(id) ON DELETE SET NULL;

-- Friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can insert friendship requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update friendships they're part of" ON public.friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can delete friendships they're part of" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Allow users to update their own profile (for last_seen, avatar_url)
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Function to search users by friend code
CREATE OR REPLACE FUNCTION public.search_friend_code(p_code TEXT)
RETURNS TABLE(user_id UUID, username TEXT, friend_code TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.friend_code, p.avatar_url
  FROM public.profiles p
  WHERE UPPER(p.friend_code) LIKE UPPER(p_code) || '%'
  LIMIT 10;
$$;

-- Policy to allow friends to view each other's trainings
CREATE POLICY "Friends can view shared trainings" ON public.trainings FOR SELECT USING (
  auth.uid() = user_id
  OR (
    visibility IN ('friends')
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = trainings.user_id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = trainings.user_id)
      )
    )
  )
);

-- Drop the old select policy and keep the new combined one
DROP POLICY IF EXISTS "Users can view their own trainings" ON public.trainings;
