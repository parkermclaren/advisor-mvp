-- Create the student_profiles table
create table if not exists public.student_profiles (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.student_transcripts(transcript_id) on delete cascade not null,
    goals text not null,
    interests jsonb not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique (student_id)
);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger handle_profiles_updated_at
    before update on public.student_profiles
    for each row
    execute function public.handle_updated_at(); 