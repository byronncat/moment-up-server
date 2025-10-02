create or replace function public.get_user_profile (
  p_username text,
  p_current_user_id uuid default null
) returns table (
  id uuid,
  username text,
  display_name text,
  avatar text,
  background_image text,
  bio text,
  followers bigint,
  following bigint,
  is_follower boolean,
  is_following boolean,
  is_muted boolean,
  is_blocked boolean,
  is_protected boolean,
  has_story boolean
) language plpgsql
set
  search_path = public as $$
begin
  return query
  with user_data as (
    select 
      u.id,
      u.username,
      u.display_name,
      u.avatar,
      u.background_image,
      u.bio,
      u.privacy
    from users u
    where lower(u.username) = lower(p_username)
  ),
  user_stats as (
    select 
      ud.id,
      ud.username,
      ud.display_name,
      ud.avatar,
      ud.background_image,
      ud.bio,
      -- Use cached stats from user_stats table
      coalesce(us.followers_count, 0) as follower_count,
      coalesce(us.following_count, 0) as following_count,
      -- Relationship checks (only if current_user_id is provided and different from target user)
      case 
        when p_current_user_id is null or p_current_user_id = ud.id then false
        else exists(select 1 from follows where follower_id = ud.id and following_id = p_current_user_id)
      end as is_follower,
      case 
        when p_current_user_id is null or p_current_user_id = ud.id then false
        else exists(select 1 from follows where follower_id = p_current_user_id and following_id = ud.id)
      end as is_following,
      case 
        when p_current_user_id is null or p_current_user_id = ud.id then false
        else exists(select 1 from mutes where muter_id = p_current_user_id and muted_id = ud.id)
      end as is_muted,
      -- Check if either user blocked the other
      case 
        when p_current_user_id is null or p_current_user_id = ud.id then false
        else (
          exists(select 1 from blocks where blocker_id = p_current_user_id and blocked_id = ud.id) or
          exists(select 1 from blocks where blocker_id = ud.id and blocked_id = p_current_user_id)
        )
      end as is_blocked,
      -- Check if profile is protected (private)
      case 
        when ud.privacy = 1 then true
        else false
      end as is_protected,
      -- Use cached story status from user_stats table
      coalesce(us.has_story, false) as has_story
    from user_data ud
    left join user_stats us on us.user_id = ud.id
  )
  select 
    us.id,
    us.username,
    us.display_name,
    us.avatar,
    us.background_image,
    us.bio,
    us.follower_count,
    us.following_count,
    us.is_follower,
    us.is_following,
    us.is_muted,
    us.is_blocked,
    us.is_protected,
    us.has_story
  from user_stats us;
end;
$$;

create or replace function public.get_user_summary_batch (
  p_user_ids uuid[],
  p_current_user_id uuid default null,
  p_mutual_limit integer default 3
) returns table (
  id uuid,
  username text,
  display_name text,
  avatar text,
  bio text,
  followers bigint,
  following bigint,
  is_following boolean,
  has_story boolean,
  followed_by jsonb
) language plpgsql
set
  search_path = public as $$
begin
  return query
  with user_base as (
    select 
      u.id,
      u.username,
      u.display_name,
      u.avatar,
      u.bio
    from users u
    where u.id = any(p_user_ids)
  ),
  user_stats as (
    select 
      ub.id,
      ub.username,
      ub.display_name,
      ub.avatar,
      ub.bio,
      -- Use cached stats from user_stats table
      coalesce(us.followers_count, 0) as follower_count,
      coalesce(us.following_count, 0) as following_count,
      -- Is current user following this user
      exists(select 1 from follows where follower_id = p_current_user_id and following_id = ub.id) as is_following,
      -- Use cached story status from user_stats table
      coalesce(us.has_story, false) as has_story
    from user_base ub
    left join user_stats us on us.user_id = ub.id
  ),
  mutual_followers_data as (
    select 
      us.id as user_id,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'id', mu.id,
          'displayName', coalesce(mu.display_name, mu.username),
          'avatar', mu.avatar
        )
      ) filter (where mu.id is not null), '[]'::jsonb) as mutual_users,
      count(mu.id) as mutual_count
    from user_stats us
    left join follows f1 on f1.following_id = us.id  -- People who follow this user
    left join follows f2 on f2.follower_id = p_current_user_id and f2.following_id = f1.follower_id  -- Current user follows them too
    left join users mu on mu.id = f1.follower_id and f2.follower_id is not null
    where f1.follower_id != p_current_user_id or f1.follower_id is null
    group by us.id
  )
  select 
    us.id,
    us.username,
    us.display_name,
    us.avatar,
    us.bio,
    us.follower_count,
    us.following_count,
    us.is_following,
    us.has_story,
    case 
      when mfd.mutual_count > 0 then
        jsonb_build_object(
          'remainingCount', greatest(0, mfd.mutual_count::int - p_mutual_limit),
          'displayItems', 
          case 
            when jsonb_array_length(mfd.mutual_users) > p_mutual_limit then
              (select jsonb_agg(value) from (
                select value from jsonb_array_elements(mfd.mutual_users) limit p_mutual_limit
              ) sub)
            else mfd.mutual_users
          end
        )
      else null
    end as followed_by
  from user_stats us
  left join mutual_followers_data mfd on mfd.user_id = us.id
  order by 
    case 
      when array_position(p_user_ids, us.id) is not null 
      then array_position(p_user_ids, us.id) 
      else 999999 
    end;
end;
$$;