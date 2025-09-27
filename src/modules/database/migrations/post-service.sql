create or replace function public.create_post_with_hashtags (
  p_user_id uuid,
  p_text text,
  p_attachments jsonb[],
  p_privacy smallint,
  p_hashtags text[]
) returns jsonb language plpgsql
set
  search_path = public as $$
declare
  new_post_id bigint;
  hashtag_name text;
  v_hashtag_id bigint;
  result_post jsonb;
begin
  -- Insert the post and capture the new ID
  insert into public.posts (user_id, text, attachments, privacy)
  values (p_user_id, p_text, p_attachments, p_privacy)
  returning id into new_post_id;

  -- Handle hashtags if provided
  if array_length(p_hashtags, 1) > 0 then
    foreach hashtag_name in array p_hashtags loop
      -- Insert hashtag if not exists
      insert into public.hashtags (name)
      values (hashtag_name)
      on conflict (name) do nothing;

      -- Get hashtag id
      select h.id
      into v_hashtag_id
      from public.hashtags h
      where h.name = hashtag_name;

      -- Insert relationship
      insert into public.post_hashtags (post_id, hashtag_id)
      values (new_post_id, v_hashtag_id)
      on conflict (post_id, hashtag_id) do nothing;
    end loop;
  end if;

  -- Return inserted post as JSONB
  select to_jsonb(p.*)
  into result_post
  from public.posts p
  where p.id = new_post_id;

  return result_post;
end;
$$;

-- Function to create post stats when a post is created
create or replace function public.create_post_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  -- Insert initial post stats with zero counts
  insert into public.post_stats (
    post_id,
    likes_count,
    comments_count,
    reposts_count,
    bookmarks_count,
    last_modified
  )
  values (
    NEW.id,
    0,
    0,
    0,
    0,
    NOW()
  );
  
  return NEW;
end;
$$;

-- Create trigger to automatically create post stats when a post is inserted
create
or replace trigger trigger_create_post_stats
after insert on public.posts for each row
execute function public.create_post_stats ();

-- Function to get batch of post stats with user interaction flags
create or replace function public.get_post_stats_batch (p_post_ids bigint[], p_current_user_id uuid) returns table (
  post_id bigint,
  likes_count bigint,
  comments_count bigint,
  reposts_count bigint,
  bookmarks_count bigint,
  is_liked boolean,
  is_bookmarked boolean
) language plpgsql
set
  search_path = public as $$
begin
  return query
  select 
    ps.post_id,
    ps.likes_count,
    ps.comments_count,
    ps.reposts_count,
    ps.bookmarks_count,
    coalesce(exists(
      select 1 from post_likes 
      where post_id = ps.post_id 
        and user_id = p_current_user_id
    ), false) as is_liked,
    coalesce(exists(
      select 1 from post_bookmarks 
      where post_id = ps.post_id 
        and user_id = p_current_user_id
    ), false) as is_bookmarked
  from post_stats ps
  where ps.post_id = any(p_post_ids)
  order by ps.post_id;
end;
$$;

-- Function to get trending hashtag scores for explore algorithm
create or replace function public.get_trending_hashtag_scores (p_hashtag_ids bigint[]) returns table (hashtag_id bigint, trending_score numeric) language plpgsql
set
  search_path = public as $$
declare
  current_window_start timestamp with time zone;
  previous_window_start timestamp with time zone;
  window_size_hours integer := 1; -- 1 hour windows for trending calculation
begin
  current_window_start := now() - interval '1 hour';
  previous_window_start := now() - interval '2 hours';
  
  return query
  with current_window_counts as (
    select 
      ph.hashtag_id,
      count(*) as current_count
    from posts p
    join post_hashtags ph on p.id = ph.post_id
    where ph.hashtag_id = any(p_hashtag_ids)
      and p.created_at >= current_window_start
      and p.created_at < now()
    group by ph.hashtag_id
  ),
  previous_window_counts as (
    select 
      ph.hashtag_id,
      count(*) as previous_count
    from posts p
    join post_hashtags ph on p.id = ph.post_id
    where ph.hashtag_id = any(p_hashtag_ids)
      and p.created_at >= previous_window_start
      and p.created_at < current_window_start
    group by ph.hashtag_id
  ),
  hashtag_metrics as (
    select 
      coalesce(c.hashtag_id, p.hashtag_id) as hashtag_id,
      coalesce(c.current_count, 0) as current_count,
      coalesce(p.previous_count, 0) as previous_count,
      case 
        when coalesce(p.previous_count, 0) = 0 then 
          case when coalesce(c.current_count, 0) > 0 then 1.0 else 0.0 end
        else 
          (coalesce(c.current_count, 0) - coalesce(p.previous_count, 0))::numeric / coalesce(p.previous_count, 0)::numeric
      end as rate_of_change,
      coalesce(c.current_count, 0) >= coalesce(p.previous_count, 0) * 2.0 as is_spike
    from current_window_counts c
    full outer join previous_window_counts p on c.hashtag_id = p.hashtag_id
  )
  select 
    hm.hashtag_id,
    -- Trending score formula: log(current + 1) * 0.3 + sigmoid(rate_of_change) * 0.4 + spike_bonus * 0.3
    (
      ln(greatest(hm.current_count, 1)) * 0.3 +
      ((2.0 / (1.0 + exp(-greatest(hm.rate_of_change, -10.0)))) - 1.0) * 0.4 +
      (case when hm.is_spike then 1.0 else 0.0 end) * 0.3
    ) as trending_score
  from hashtag_metrics hm
  where hm.current_count >= 5 -- Minimum threshold for trending
  order by trending_score desc;
end;
$$;

-- Function to get explore posts with advanced scoring algorithm
create or replace function public.get_explore_posts (
  p_current_user_id uuid,
  p_excluded_user_ids uuid[],
  p_post_type text default 'post',
  p_limit integer default 30,
  p_offset integer default 0
) returns table (
  post_id bigint,
  user_id uuid,
  text text,
  attachments jsonb[],
  privacy smallint,
  created_at timestamp with time zone,
  last_modified timestamp with time zone,
  explore_score numeric,
  user_summary jsonb,
  post_stats jsonb
) language plpgsql
set
  search_path = public as $$
declare
  time_decay_factor numeric := 0.1; -- Controls how quickly posts age out
  engagement_weight numeric := 0.4;
  trending_weight numeric := 0.3;
  recency_weight numeric := 0.3;
begin
  return query
  with excluded_users as (
    select unnest(p_excluded_user_ids) as excluded_id
  ),
  post_engagement as (
    select 
      p.id as post_id,
      -- Recent engagement score (last 24 hours weighted more heavily)
      (
        coalesce(recent_likes.likes_24h, 0) * 3.0 +
        coalesce(recent_comments.comments_24h, 0) * 2.0 +
        coalesce(recent_reposts.reposts_24h, 0) * 2.0 +
        coalesce(recent_bookmarks.bookmarks_24h, 0) * 1.5 +
        coalesce(all_likes.total_likes, 0) * 0.5 +
        coalesce(all_comments.total_comments, 0) * 0.3 +
        coalesce(all_reposts.total_reposts, 0) * 0.3 +
        coalesce(all_bookmarks.total_bookmarks, 0) * 0.2
      ) as engagement_score
    from posts p
    left join (
      select 
        pl.post_id,
        count(*) as likes_24h
      from post_likes pl
      where pl.created_at >= now() - interval '24 hours'
      group by pl.post_id
    ) recent_likes on p.id = recent_likes.post_id
    left join (
      select 
        c.post_id,
        count(*) as comments_24h
      from comments c
      where c.created_at >= now() - interval '24 hours'
      group by c.post_id
    ) recent_comments on p.id = recent_comments.post_id
    left join (
      select 
        r.post_id,
        count(*) as reposts_24h
      from reposts r
      where r.created_at >= now() - interval '24 hours'
      group by r.post_id
    ) recent_reposts on p.id = recent_reposts.post_id
    left join (
      select 
        pb.post_id,
        count(*) as bookmarks_24h
      from post_bookmarks pb
      where pb.created_at >= now() - interval '24 hours'
      group by pb.post_id
    ) recent_bookmarks on p.id = recent_bookmarks.post_id
    left join (
      select 
        pl.post_id,
        count(*) as total_likes
      from post_likes pl
      group by pl.post_id
    ) all_likes on p.id = all_likes.post_id
    left join (
      select 
        c.post_id,
        count(*) as total_comments
      from comments c
      group by c.post_id
    ) all_comments on p.id = all_comments.post_id
    left join (
      select 
        r.post_id,
        count(*) as total_reposts
      from reposts r
      group by r.post_id
    ) all_reposts on p.id = all_reposts.post_id
    left join (
      select 
        pb.post_id,
        count(*) as total_bookmarks
      from post_bookmarks pb
      group by pb.post_id
    ) all_bookmarks on p.id = all_bookmarks.post_id
  ),
  post_hashtags_with_trending as (
    select 
      ph.post_id,
      ph.hashtag_id,
      coalesce(th.trending_score, 0.0) as trending_score
    from post_hashtags ph
    left join (
      select hashtag_id, trending_score
      from get_trending_hashtag_scores(
        (select array_agg(distinct hashtag_id) from post_hashtags)
      )
    ) th on ph.hashtag_id = th.hashtag_id
  ),
  post_trending_scores as (
    select 
      pht.post_id,
      coalesce(max(pht.trending_score), 0.0) as max_trending_score,
      coalesce(avg(pht.trending_score), 0.0) as avg_trending_score
    from post_hashtags_with_trending pht
    group by pht.post_id
  ),
  explore_posts as (
    select 
      p.id as post_id,
      p.user_id,
      p.text,
      p.attachments,
      p.privacy,
      p.created_at,
      p.last_modified,
      -- Time decay: exponential decay based on post age
      exp(-time_decay_factor * extract(epoch from (now() - p.created_at)) / 3600.0) as time_score,
      -- Combined explore score
      (
        -- Recency component (30%)
        exp(-time_decay_factor * extract(epoch from (now() - p.created_at)) / 3600.0) * recency_weight +
        -- Engagement component (40%)
        coalesce(pe.engagement_score, 0.0) / 100.0 * engagement_weight +
        -- Trending component (30%) - use max trending score from hashtags
        coalesce(pt.max_trending_score, 0.0) * trending_weight
      ) as explore_score,
      -- User summary data
      jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'display_name', u.display_name,
        'avatar', u.avatar,
        'bio', u.bio,
        'followers', (select count(*) from follows f1 where f1.following_id = u.id),
        'following', (select count(*) from follows f2 where f2.follower_id = u.id),
        'is_following', exists(select 1 from follows f3 where f3.follower_id = p_current_user_id and f3.following_id = u.id),
        'is_follower', exists(select 1 from follows f4 where f4.follower_id = u.id and f4.following_id = p_current_user_id),
        'is_muted', exists(select 1 from mutes m where m.muter_id = p_current_user_id and m.muted_id = u.id),
        'has_story', exists(select 1 from stories s where s.user_id = u.id and s.created_at >= now() - interval '24 hours')
      ) as user_summary,
      -- Post stats
      jsonb_build_object(
        'likes_count', coalesce(ps.likes_count, 0),
        'comments_count', coalesce(ps.comments_count, 0),
        'reposts_count', coalesce(ps.reposts_count, 0),
        'bookmarks_count', coalesce(ps.bookmarks_count, 0),
        'is_liked', exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = p_current_user_id),
        'is_bookmarked', exists(select 1 from post_bookmarks pb where pb.post_id = p.id and pb.user_id = p_current_user_id)
      ) as post_stats
    from posts p
    join users u on p.user_id = u.id
    left join post_engagement pe on p.id = pe.post_id
    left join post_trending_scores pt on p.id = pt.post_id
    left join post_stats ps on p.id = ps.post_id
    where p.user_id not in (select excluded_id from excluded_users)
      and p.privacy <= case when p.user_id = p_current_user_id then 3 else 1 end -- Respect privacy settings
      and (p_post_type = 'post' or (p_post_type = 'media' and p.attachments is not null and array_length(p.attachments, 1) > 0))
  )
  select 
    ep.post_id,
    ep.user_id,
    ep.text,
    ep.attachments,
    ep.privacy,
    ep.created_at,
    ep.last_modified,
    ep.explore_score,
    ep.user_summary,
    ep.post_stats
  from explore_posts ep
  order by ep.explore_score desc, ep.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;