-- Demo data for every section (accounts, transfers, income, expenses, projects, investments).
-- Run once on an EMPTY database (after migrations + seeds):
--   psql -v ON_ERROR_STOP=1 -d <db> -f packages/db/sample-data.sql
-- Not a Knex seed on purpose: it must never run automatically on deploy.
begin;

do $$
begin
  if exists (select 1 from accounts) or exists (select 1 from transactions) or exists (select 1 from projects) then
    raise exception 'Database already has data: sample data is only for an empty database';
  end if;
end $$;

insert into accounts (name, type, opening_balance, is_active) values
  ('Commercial Bank – Business', 'bank', 600000.00, true),
  ('Sampath Bank – Savings', 'bank', 150000.00, true),
  ('Cash in Hand', 'cash', 25000.00, true),
  ('FriMi Wallet', 'wallet', 10000.00, true),
  ('Old Petty Cash', 'cash', 2500.00, true);

insert into projects (name, client_name, description, status, start_date) values
  ('Ceylon Tea Exports Website', 'Ceylon Tea Exports (Pvt) Ltd', 'Corporate website with product catalogue and enquiry form.', 'completed', '2026-01-12'),
  ('Smile Dental Booking App', 'Smile Dental Clinic', 'Appointment booking web app with SMS reminders.', 'active', '2026-03-02'),
  ('Hill Country Hotel Portal', 'Hill Country Resorts', 'Room booking portal and admin dashboard.', 'active', '2026-05-18'),
  ('Galle Fashion E-commerce', 'Galle Fashion House', 'Online store; cancelled by client after design phase.', 'cancelled', '2026-02-20'),
  ('InvoGen SaaS (internal)', null, 'Internal invoicing product built by Kwings Media.', 'active', '2026-01-05');

-- Helpers: look up ids by name.
create temporary table ids on commit drop as
  select 'acc:' || name as k, id from accounts
  union all select 'prj:' || name, id from projects
  union all select type || ':' || name, id from categories;

create function pg_temp.id(key text) returns uuid language sql as $f$ select id from ids where k = key $f$;

insert into transactions (type, account_id, category_id, project_id, amount, description, transaction_date)
select v.type, pg_temp.id('acc:' || v.account), pg_temp.id(v.type || ':' || v.category),
       case when v.project is null then null else pg_temp.id('prj:' || v.project) end,
       v.amount, v.description, v.d::date
from (values
  -- Ceylon Tea Exports Website (completed)
  ('income',  'Commercial Bank – Business', 'Website Development', 'Ceylon Tea Exports Website', 180000.00, 'Advance payment 40%', '2026-01-15'),
  ('income',  'Commercial Bank – Business', 'Website Development', 'Ceylon Tea Exports Website', 135000.00, 'Design approval milestone 30%', '2026-02-20'),
  ('income',  'Commercial Bank – Business', 'Website Development', 'Ceylon Tea Exports Website', 135000.00, 'Final payment on launch', '2026-03-28'),
  ('expense', 'Commercial Bank – Business', 'Domains',             'Ceylon Tea Exports Website',   8500.00, '.lk domain registration', '2026-01-18'),
  ('expense', 'FriMi Wallet',               'Software Subscriptions','Ceylon Tea Exports Website',  12400.00, 'Premium theme + stock photos', '2026-01-25'),
  ('expense', 'Commercial Bank – Business', 'Salaries',            'Ceylon Tea Exports Website',  60000.00, 'Freelance content writer', '2026-02-28'),
  ('income',  'Commercial Bank – Business', 'Hosting',             'Ceylon Tea Exports Website',  36000.00, 'Annual hosting plan', '2026-04-01'),
  -- Smile Dental Booking App (active)
  ('income',  'Commercial Bank – Business', 'Software Development','Smile Dental Booking App',    250000.00, 'Advance payment', '2026-03-05'),
  ('income',  'Commercial Bank – Business', 'Software Development','Smile Dental Booking App',    200000.00, 'Milestone 2: booking module', '2026-05-30'),
  ('income',  'Commercial Bank – Business', 'Software Development','Smile Dental Booking App',    150000.00, 'Milestone 3: SMS reminders', '2026-08-25'),
  ('expense', 'Commercial Bank – Business', 'Software Subscriptions','Smile Dental Booking App',   18500.00, 'SMS gateway credits', '2026-06-10'),
  ('expense', 'Commercial Bank – Business', 'Hosting',             'Smile Dental Booking App',     24000.00, 'Cloud server (6 months)', '2026-04-02'),
  ('expense', 'Commercial Bank – Business', 'Salaries',            'Smile Dental Booking App',     90000.00, 'Contract mobile developer', '2026-07-31'),
  -- Hill Country Hotel Portal (active)
  ('income',  'Commercial Bank – Business', 'Website Development', 'Hill Country Hotel Portal',   220000.00, 'Advance payment', '2026-05-20'),
  ('income',  'Sampath Bank – Savings',     'Website Development', 'Hill Country Hotel Portal',   160000.00, 'Milestone 2: booking engine', '2026-09-15'),
  ('expense', 'Commercial Bank – Business', 'Software Subscriptions','Hill Country Hotel Portal',  32000.00, 'Payment gateway setup fee', '2026-06-05'),
  ('expense', 'Cash in Hand',               'Transport',           'Hill Country Hotel Portal',    14500.00, 'Site visit to Nuwara Eliya', '2026-05-25'),
  ('expense', 'Commercial Bank – Business', 'Salaries',            'Hill Country Hotel Portal',   110000.00, 'Contract UI designer', '2026-08-30'),
  -- Galle Fashion E-commerce (cancelled: loss)
  ('income',  'Commercial Bank – Business', 'Website Development', 'Galle Fashion E-commerce',     40000.00, 'Design phase payment', '2026-03-01'),
  ('expense', 'Commercial Bank – Business', 'Salaries',            'Galle Fashion E-commerce',     45000.00, 'Designer fees for mockups', '2026-03-15'),
  ('expense', 'FriMi Wallet',               'Software Subscriptions','Galle Fashion E-commerce',    9800.00, 'E-commerce plugin licence', '2026-03-08'),
  -- InvoGen SaaS (internal)
  ('income',  'FriMi Wallet',               'Software Development','InvoGen SaaS (internal)',      18000.00, 'First 6 subscribers (monthly)', '2026-07-01'),
  ('income',  'FriMi Wallet',               'Software Development','InvoGen SaaS (internal)',      27000.00, 'Subscribers (monthly)', '2026-08-01'),
  ('income',  'Commercial Bank – Business', 'Software Development','InvoGen SaaS (internal)',      39000.00, 'Subscribers (monthly)', '2026-09-01'),
  ('income',  'Commercial Bank – Business', 'Software Development','InvoGen SaaS (internal)',      48000.00, 'Subscribers (monthly)', '2026-10-01'),
  ('expense', 'Commercial Bank – Business', 'Marketing',           'InvoGen SaaS (internal)',      35000.00, 'Facebook & Google ads launch', '2026-06-20'),
  ('expense', 'Commercial Bank – Business', 'Hosting',             'InvoGen SaaS (internal)',      15000.00, 'Production database server', '2026-06-25'),
  -- General (no project)
  ('income',  'Cash in Hand',               'Consulting',          null,                           25000.00, 'IT consulting – local shop POS', '2026-02-10'),
  ('income',  'Sampath Bank – Savings',     'Consulting',          null,                           40000.00, 'Digital strategy workshop', '2026-06-14'),
  ('income',  'Commercial Bank – Business', 'Maintenance',         null,                           30000.00, 'Quarterly maintenance – 3 clients', '2026-04-05'),
  ('income',  'Commercial Bank – Business', 'Maintenance',         null,                           30000.00, 'Quarterly maintenance – 3 clients', '2026-07-05'),
  ('income',  'Commercial Bank – Business', 'Maintenance',         null,                           36000.00, 'Quarterly maintenance – 4 clients', '2026-10-05'),
  ('income',  'Cash in Hand',               'Other Income',        null,                            7500.00, 'Old laptop sold', '2026-08-12'),
  ('expense', 'Commercial Bank – Business', 'Domains',             null,                            4200.00, 'kwingsmedia.com renewal', '2026-02-03'),
  ('expense', 'Cash in Hand',               'Office Expenses',     null,                            6800.00, 'Stationery and printer ink', '2026-04-18'),
  ('expense', 'Cash in Hand',               'Transport',           null,                            3200.00, 'Client meetings – Colombo', '2026-09-09'),
  ('expense', 'Commercial Bank – Business', 'Marketing',           null,                           22000.00, 'Business cards and brochure print', '2026-05-07'),
  ('expense', 'Old Petty Cash',             'Office Expenses',     null,                            2500.00, 'Tea and refreshments', '2026-01-30')
) as v(type, account, category, project, amount, description, d);

-- Monthly running costs Jan–Oct.
insert into transactions (type, account_id, category_id, project_id, amount, description, transaction_date)
select 'expense', pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('expense:' || c.category), null, c.amount,
       c.description || ' – ' || to_char(m, 'Mon YYYY'), (m + (c.day - 1) * interval '1 day')::date
from generate_series('2026-01-01'::date, '2026-10-01'::date, interval '1 month') m
cross join (values
  ('Salaries',               85000.00, 'Junior developer salary', 25),
  ('Office Expenses',        15000.00, 'Co-working desk rent',     1),
  ('Software Subscriptions',  9500.00, 'Google Workspace + Figma', 3),
  ('Hosting',                 6500.00, 'Company VPS',              7)
) as c(category, amount, description, day);

insert into transactions (type, account_id, category_id, project_id, amount, description, transaction_date)
select 'income', pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('income:Hosting'), null, 12000.00,
       'Shared hosting – client sites – ' || to_char(m, 'Mon YYYY'), (m + interval '9 days')::date
from generate_series('2026-01-01'::date, '2026-10-01'::date, interval '1 month') m;

insert into transfers (from_account_id, to_account_id, amount, description, transfer_date) values
  (pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('acc:Cash in Hand'), 20000.00, 'Cash withdrawal for petty expenses', '2026-03-03'),
  (pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('acc:Sampath Bank – Savings'), 100000.00, 'Move profit to savings', '2026-04-30'),
  (pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('acc:FriMi Wallet'), 15000.00, 'Top up wallet for online payments', '2026-06-01'),
  (pg_temp.id('acc:Sampath Bank – Savings'), pg_temp.id('acc:Commercial Bank – Business'), 50000.00, 'Cover salaries', '2026-09-24'),
  (pg_temp.id('acc:FriMi Wallet'), pg_temp.id('acc:Commercial Bank – Business'), 30000.00, 'Withdraw subscription income', '2026-09-30');

insert into investments (name, account_id, project_id, amount, description, investment_date) values
  ('InvoGen MVP development', pg_temp.id('acc:Sampath Bank – Savings'), pg_temp.id('prj:InvoGen SaaS (internal)'), 120000.00, 'Capital for building the first version', '2026-01-08'),
  ('InvoGen launch budget', pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('prj:InvoGen SaaS (internal)'), 60000.00, 'Payment gateway + legal setup', '2026-06-15'),
  ('Hotel portal booking engine licence', pg_temp.id('acc:Commercial Bank – Business'), pg_temp.id('prj:Hill Country Hotel Portal'), 75000.00, 'One-time licence, recovered through project fees', '2026-05-22'),
  ('MacBook Pro for development', pg_temp.id('acc:Commercial Bank – Business'), null, 350000.00, 'Business equipment', '2026-02-14');

-- Archive the old petty cash account (it keeps its history).
update accounts set is_active = false where name = 'Old Petty Cash';

commit;
