
-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- career_profile
create table career_profile (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  education jsonb,
  skills jsonb,
  values_assessment text,
  resume_url text,
  bio text,
  created_at timestamp with time zone default now()
);

-- goal_plan
create table goal_plan (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  milestones jsonb, -- { "30": [], "60": [], "90": [] }
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- applications
create table applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  job_title text not null,
  company text not null,
  status text default 'applied', -- applied, interviewing, offer, rejected
  match_score int,
  created_at timestamp with time zone default now()
);

-- interview_logs
create table interview_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  questions jsonb, -- array of { "q": "", "a": "", "feedback": "" }
  score int,
  created_at timestamp with time zone default now()
);

-- networking_attempts
create table networking_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  contact_name text,
  role text,
  company text,
  message text,
  status text default 'sent',
  created_at timestamp with time zone default now()
);

-- resumes parsed and stored per user
create table resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  data jsonb not null,
  raw_text text,
  created_at timestamp with time zone default now()
);

-- unified events log
create table events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  action text not null,
  context jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table career_profile enable row level security;
alter table goal_plan enable row level security;
alter table applications enable row level security;
alter table interview_logs enable row level security;
alter table networking_attempts enable row level security;
alter table resumes enable row level security;
alter table events enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

create policy "Users can view own career profile." on career_profile for select using (auth.uid() = user_id);
create policy "Users can insert own career profile." on career_profile for insert with check (auth.uid() = user_id);
create policy "Users can update own career profile." on career_profile for update using (auth.uid() = user_id);

-- same for others
create policy "Users can view own goal plan." on goal_plan for select using (auth.uid() = user_id);
create policy "Users can insert own goal plan." on goal_plan for insert with check (auth.uid() = user_id);
create policy "Users can update own goal plan." on goal_plan for update using (auth.uid() = user_id);

create policy "Users can view own applications." on applications for select using (auth.uid() = user_id);
create policy "Users can insert own applications." on applications for insert with check (auth.uid() = user_id);
create policy "Users can update own applications." on applications for update using (auth.uid() = user_id);

create policy "Users can view own interviews." on interview_logs for select using (auth.uid() = user_id);
create policy "Users can insert own interviews." on interview_logs for insert with check (auth.uid() = user_id);

create policy "Users can view own networking." on networking_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own networking." on networking_attempts for insert with check (auth.uid() = user_id);
create policy "Users can update own networking." on networking_attempts for update using (auth.uid() = user_id);

-- resumes policies
create policy "Users can view own resumes." on resumes for select using (auth.uid() = user_id);
create policy "Users can insert own resume." on resumes for insert with check (auth.uid() = user_id);

-- events policies
create policy "Users can view own events." on events for select using (auth.uid() = user_id);
create policy "Users can insert own events." on events for insert with check (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
