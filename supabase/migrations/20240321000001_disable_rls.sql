-- Disable RLS on student_profiles
alter table public.student_profiles disable row level security;

-- Drop existing RLS policies if they exist
drop policy if exists "Users can view their own profile" on public.student_profiles;
drop policy if exists "Users can insert their own profile" on public.student_profiles;
drop policy if exists "Users can update their own profile" on public.student_profiles; 