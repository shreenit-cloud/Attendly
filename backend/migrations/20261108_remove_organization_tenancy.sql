begin;

-- Remove tenant metadata while preserving teachers, students, classes, sessions, and attendance.
drop table if exists public.organization_invites;

alter table public.attendance_sessions drop constraint if exists sessions_organization_id_fkey;
alter table public.classes drop constraint if exists classes_organization_id_fkey;
alter table public.students drop constraint if exists students_organization_id_fkey;
alter table public.teachers drop constraint if exists teachers_organization_id_fkey;

drop index if exists public.sessions_organization_id_idx;
drop index if exists public.classes_organization_id_idx;
drop index if exists public.students_organization_id_idx;
drop index if exists public.teachers_organization_id_idx;

alter table public.attendance_sessions drop column if exists organization_id;
alter table public.classes drop column if exists organization_id;
alter table public.students drop column if exists organization_id;
alter table public.teachers drop column if exists organization_id;
alter table public.teachers drop column if exists is_org_admin;

drop table if exists public.organizations;

commit;
