-- Profile auto-creation trigger
-- When a new user signs up via Supabase Auth, automatically create a profiles row.
-- Reads tenant_id, full_name, and role from raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    tenant_id,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'tenant_id')::BIGINT, 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
