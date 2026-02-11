create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null,
  is_super boolean default false,
  first_name text,
  last_name text,
  email text,
  phone text,
  must_change_password boolean default false,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id bigserial primary key,
  name text unique not null
);

create table if not exists user_tasks (
  user_id uuid references users(id) on delete cascade,
  task_id bigint references tasks(id) on delete cascade,
  primary key (user_id, task_id)
);

create table if not exists role_tasks (
  role text not null,
  task_id bigint references tasks(id) on delete cascade,
  primary key (role, task_id)
);

create table if not exists categories (
  id bigserial primary key,
  name text unique not null
);

create table if not exists departments (
  id bigserial primary key,
  name text unique not null
);

create table if not exists tickets (
  id bigserial primary key,
  department text,
  summary text not null,
  description text,
  creator text,
  status text,
  priority text,
  category text,
  assignee text,
  created_at timestamptz default now()
);

create table if not exists ticket_comments (
  id bigserial primary key,
  ticket_id bigint references tickets(id) on delete cascade,
  author text,
  body text,
  created_at timestamptz default now()
);

create table if not exists attachments (
  id bigserial primary key,
  ticket_id bigint references tickets(id) on delete cascade,
  comment_id bigint references ticket_comments(id) on delete cascade,
  original_name text,
  stored_name text,
  mime text,
  size integer,
  path text,
  created_at timestamptz default now(),
  uploader text
);

create table if not exists notification_settings (
  id integer primary key,
  notify_on_create boolean default true,
  notify_on_update boolean default true,
  notify_on_comment boolean default true,
  role_recipients jsonb,
  user_recipients jsonb,
  notification_matrix jsonb
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor_id uuid,
  actor_username text,
  actor_role text,
  action text,
  entity_type text,
  entity_id text,
  detail jsonb,
  ip text,
  created_at timestamptz default now()
);

create index if not exists idx_tickets_created_at on tickets (created_at);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at);
create index if not exists idx_audit_logs_actor on audit_logs (actor_username);

create or replace function report_ticket_volume(from_ts timestamptz default null, to_ts timestamptz default null)
returns table(status text, count bigint)
language sql
as $$
  select coalesce(status, 'Unknown') as status, count(*) as count
  from tickets
  where (from_ts is null or created_at >= from_ts)
    and (to_ts is null or created_at <= to_ts)
  group by status
  order by count desc;
$$;

create or replace function report_technician_workload(from_ts timestamptz default null, to_ts timestamptz default null)
returns table(assignee text, count bigint)
language sql
as $$
  select assignee, count(*) as count
  from tickets
  where assignee is not null and trim(assignee) <> ''
    and (from_ts is null or created_at >= from_ts)
    and (to_ts is null or created_at <= to_ts)
  group by assignee
  order by count desc;
$$;

create or replace function report_sla_performance(from_ts timestamptz default null, to_ts timestamptz default null)
returns table(open_count bigint, avg_open_hours numeric)
language sql
as $$
  select
    count(*) filter (where status is null or lower(status) <> 'closed') as open_count,
    avg(extract(epoch from (now() - created_at)) / 3600.0)
      filter (where status is null or lower(status) <> 'closed') as avg_open_hours
  from tickets
  where (from_ts is null or created_at >= from_ts)
    and (to_ts is null or created_at <= to_ts);
$$;

create or replace function report_user_activity(from_ts timestamptz default null, to_ts timestamptz default null)
returns table(user_name text, action text, count bigint)
language sql
as $$
  select actor_username as user_name, action, count(*) as count
  from audit_logs
  where (from_ts is null or created_at >= from_ts)
    and (to_ts is null or created_at <= to_ts)
    and actor_username is not null
    and trim(actor_username) <> ''
  group by actor_username, action
  order by count desc;
$$;
