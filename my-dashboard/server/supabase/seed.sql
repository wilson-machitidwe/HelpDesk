insert into tasks (name) values
  ('View Dashboard'),
  ('View Tickets Page'),
  ('View Users Page'),
  ('View Reports Page'),
  ('View Config Page'),
  ('Create Users'),
  ('Edit Users'),
  ('Delete Users'),
  ('Manage Categories'),
  ('Manage Departments'),
  ('Manage Email Notifications'),
  ('Create Tickets'),
  ('View All Tickets'),
  ('Assign Tickets'),
  ('Modify Tickets'),
  ('Close Tickets'),
  ('Delete Tickets'),
  ('Edit Tickets'),
  ('Comment on Tickets'),
  ('View own Tickets'),
  ('View New Tickets Stat'),
  ('View Your Tickets Stat'),
  ('View Open Tickets Stat'),
  ('View Unassigned Tickets Stat'),
  ('View Ticket History Chart'),
  ('View Ticket Churn Chart'),
  ('View First Response Time'),
  ('View Tickets Close Time'),
  ('View Category Breakdown'),
  ('View Top Ticket Creators'),
  ('View Ticket History'),
  ('View own Ticket History')
on conflict do nothing;

with task_ids as (
  select id, name from tasks
)
insert into role_tasks (role, task_id)
select 'Admin', id from task_ids
on conflict do nothing;

with manager_tasks as (
  select id from tasks where name in (
    'View Dashboard',
    'View Tickets Page',
    'View Users Page',
    'View Reports Page',
    'Create Tickets',
    'View All Tickets',
    'Assign Tickets',
    'Modify Tickets',
    'Close Tickets',
    'Edit Tickets',
    'Comment on Tickets',
    'View own Tickets',
    'View New Tickets Stat',
    'View Your Tickets Stat',
    'View Open Tickets Stat',
    'View Unassigned Tickets Stat',
    'View Ticket History Chart',
    'View Ticket Churn Chart',
    'View First Response Time',
    'View Tickets Close Time',
    'View Category Breakdown',
    'View Top Ticket Creators',
    'View Ticket History',
    'View own Ticket History'
  )
)
insert into role_tasks (role, task_id)
select 'Manager', id from manager_tasks
on conflict do nothing;

with tech_tasks as (
  select id from tasks where name in (
    'View Dashboard',
    'View Tickets Page',
    'Create Tickets',
    'View All Tickets',
    'Assign Tickets',
    'Modify Tickets',
    'Edit Tickets',
    'Comment on Tickets',
    'View own Tickets',
    'View New Tickets Stat',
    'View Your Tickets Stat',
    'View Open Tickets Stat',
    'View Unassigned Tickets Stat',
    'View Ticket History Chart',
    'View Ticket Churn Chart',
    'View First Response Time',
    'View Tickets Close Time',
    'View Category Breakdown',
    'View Top Ticket Creators',
    'View Ticket History',
    'View own Ticket History'
  )
)
insert into role_tasks (role, task_id)
select 'Technician', id from tech_tasks
on conflict do nothing;

with user_tasks as (
  select id from tasks where name in (
    'View Dashboard',
    'View Tickets Page',
    'Create Tickets',
    'Comment on Tickets',
    'View own Tickets',
    'View New Tickets Stat',
    'View Your Tickets Stat',
    'View Open Tickets Stat',
    'View Unassigned Tickets Stat',
    'View Ticket History Chart',
    'View Ticket Churn Chart',
    'View First Response Time',
    'View Tickets Close Time',
    'View Category Breakdown',
    'View Top Ticket Creators',
    'View Ticket History',
    'View own Ticket History'
  )
)
insert into role_tasks (role, task_id)
select 'User', id from user_tasks
on conflict do nothing;

insert into categories (name) values
  ('Electricity Problem'),
  ('Water Problem'),
  ('General Problem')
on conflict do nothing;

insert into departments (name) values
  ('Development'),
  ('Education'),
  ('Health Centre'),
  ('Support')
on conflict do nothing;

insert into notification_settings (id, notify_on_create, notify_on_update, notify_on_comment, role_recipients, user_recipients, notification_matrix)
values (
  1,
  true,
  true,
  true,
  '["Admin"]'::jsonb,
  '[]'::jsonb,
  '{
    "opened": {"creator": true, "assignee": false, "technician": true, "manager": true, "admin": true},
    "assigned": {"creator": false, "assignee": true, "technician": false, "manager": true, "admin": true},
    "commented": {"creator": true, "assignee": true, "technician": false, "manager": false, "admin": false},
    "closed": {"creator": true, "assignee": true, "technician": true, "manager": true, "admin": true},
    "closedDuplicate": {"creator": true, "assignee": true, "technician": true, "manager": true, "admin": true},
    "reopened": {"creator": true, "assignee": true, "technician": true, "manager": true, "admin": true}
  }'::jsonb
)
on conflict (id) do nothing;
