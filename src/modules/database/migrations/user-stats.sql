-- Function to create user stats when a user is created
create or replace function public.create_user_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  insert into public.user_stats (user_id) values (NEW.id);
  return NEW;
end;
$$;

-- Trigger to automatically create user stats
create
or replace trigger trigger_create_user_stats
after insert on public.users for each row
execute function public.create_user_stats ();

-- Function to increment user stats
create or replace function public.increment_user_stat (p_user_id uuid, p_field text, p_increment integer) returns bigint language plpgsql
set
  search_path = public as $$
declare
  result bigint;
begin
  if p_field not in ('followers_count', 'following_count', 'posts_count') then
    raise exception 'Invalid field name: %', p_field;
  end if;

  execute format(
    'update user_stats
     set %I = COALESCE(%I, 0) + $1,
         last_modified = NOW()
     where user_id = $2
     returning %I',
    p_field, p_field, p_field
  )
  into result
  using p_increment, p_user_id;

  return result;
end;
$$;

-- Function to update story status
create or replace function public.update_user_story_status (p_user_id uuid, p_has_story boolean) returns void language plpgsql
set
  search_path = public as $$
begin
  update user_stats
  set has_story = p_has_story,
      last_modified = now()
  where user_id = p_user_id;
end;
$$;

-- Function to refresh user stats (for maintenance)
create or replace function public.refresh_user_stats (p_user_id uuid) returns void language plpgsql
set
  search_path = public as $$
begin
  update user_stats us
  set 
    followers_count = (
      select count(*) 
      from follows f 
      where f.following_id = p_user_id
    ),
    following_count = (
      select count(*) 
      from follows f 
      where f.follower_id = p_user_id
    ),
    posts_count = (
      select count(*) 
      from posts p 
      where p.user_id = p_user_id
    ),
    has_story = (
      select exists(
        select 1 from stories s 
        where s.user_id = p_user_id 
        and s.created_at > now() - interval '24 hours'
      )
    ),
    last_modified = now()
  where us.user_id = p_user_id;
end;
$$;

-- Function to refresh all user stats
create or replace function public.refresh_all_user_stats () returns void language plpgsql
set
  search_path = public as $$
begin
  update user_stats us
  set 
    followers_count = (
      select count(*) 
      from follows f 
      where f.following_id = us.user_id
    ),
    following_count = (
      select count(*) 
      from follows f 
      where f.follower_id = us.user_id
    ),
    posts_count = (
      select count(*) 
      from posts p 
      where p.user_id = us.user_id
    ),
    has_story = (
      select exists(
        select 1 from stories s 
        where s.user_id = us.user_id 
        and s.created_at > now() - interval '24 hours'
      )
    ),
    last_modified = now();
end;
$$;

-- Triggers to automatically update user stats when relationships change
-- Update follower count when someone follows/unfollows
create or replace function public.update_follower_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    -- Increment follower count for the user being followed
    perform increment_user_stat(NEW.following_id, 'followers_count', 1);
    -- Increment following count for the user doing the following
    perform increment_user_stat(NEW.follower_id, 'following_count', 1);
    return NEW;
  elsif TG_OP = 'DELETE' then
    -- Decrement follower count for the user being unfollowed
    perform increment_user_stat(OLD.following_id, 'followers_count', -1);
    -- Decrement following count for the user doing the unfollowing
    perform increment_user_stat(OLD.follower_id, 'following_count', -1);
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trigger_update_follower_stats
after insert
or delete on public.follows for each row
execute function public.update_follower_stats ();

-- Update posts count when posts are created/deleted
create or replace function public.update_posts_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform increment_user_stat(NEW.user_id, 'posts_count', 1);
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform increment_user_stat(OLD.user_id, 'posts_count', -1);
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trigger_update_posts_stats
after insert
or delete on public.posts for each row
execute function public.update_posts_stats ();

-- Update story status when stories are created/expired
create or replace function public.update_story_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform update_user_story_status(NEW.user_id, true);
    return NEW;
  elsif TG_OP = 'DELETE' then
    -- Check if user has any recent stories after deletion
    perform update_user_story_status(OLD.user_id, 
      exists(select 1 from stories where user_id = OLD.user_id and created_at > now() - interval '24 hours')
    );
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trigger_update_story_stats
after insert
or delete on public.stories for each row
execute function public.update_story_stats ();