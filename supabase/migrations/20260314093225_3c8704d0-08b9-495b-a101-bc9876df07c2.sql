
-- Drop and recreate trigger to ensure it's correct
DROP TRIGGER IF EXISTS set_friend_code ON public.profiles;
CREATE TRIGGER set_friend_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_friend_code();

-- Backfill friend_code for existing profiles
UPDATE public.profiles
SET friend_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8))
WHERE friend_code IS NULL;
