-- Create the course alignments table
create table if not exists course_alignments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid not null,
  course_id text not null,
  title text not null,
  alignment_score decimal not null,
  reason text not null,
  recommendation_type text not null,
  priority integer not null,
  category text not null,
  credits integer not null,
  generated_at timestamp with time zone not null,
  
  -- Constraints
  constraint course_alignments_student_course_unique unique (student_id, course_id),
  constraint course_alignments_alignment_score_range check (alignment_score >= 0 and alignment_score <= 1),
  constraint course_alignments_priority_range check (priority >= 1 and priority <= 5),
  constraint course_alignments_credits_positive check (credits > 0),
  constraint course_alignments_recommendation_type_valid check (recommendation_type in ('gen_ed', 'elective'))
);

-- Create index for faster lookups
create index if not exists course_alignments_student_id_idx on course_alignments(student_id);

-- Enable RLS
alter table course_alignments enable row level security;

-- Create policies
create policy "Allow public read access"
  on course_alignments for select
  using (true);

create policy "Allow public insert access"
  on course_alignments for insert
  with check (true);

create policy "Allow public update access"
  on course_alignments for update
  using (true)
  with check (true); 