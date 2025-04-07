-- Update student_schedules table to support the new schedule builder
ALTER TABLE IF EXISTS public.student_schedules
ADD COLUMN IF NOT EXISTS sections JSONB,
ADD COLUMN IF NOT EXISTS conflicts JSONB,
ADD COLUMN IF NOT EXISTS stats JSONB; 