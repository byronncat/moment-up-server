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
  -- Insert the post
  insert into posts (user_id, text, attachments, privacy)
  values (p_user_id, p_text, p_attachments, p_privacy)
  returning id, to_jsonb(posts.*) into new_post_id, result_post;

  -- Process hashtags if any exist
  if array_length(p_hashtags, 1) > 0 then
    foreach hashtag_name in array p_hashtags loop
      -- Insert hashtag and fetch id
      insert into hashtags (name)
      values (hashtag_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_hashtag_id;

      -- Insert the post-hashtag relationship
      insert into post_hashtags (post_id, hashtag_id)
      values (new_post_id, v_hashtag_id)
      on conflict (post_id, hashtag_id) do nothing;
    end loop;
  end if;

  return result_post;
end;
$$;

create or replace function public.update_post_with_hashtags (
  p_user_id uuid,
  p_post_id bigint,
  p_text text,
  p_privacy smallint,
  p_hashtags text[]
) returns jsonb language plpgsql
set
  search_path = public as $$
declare
  hashtag_name text;
  v_hashtag_id bigint;
  result_post jsonb;
begin
  -- Update the post
  update posts
  set text = p_text,
      privacy = p_privacy,
      last_modified = now()
  where id = p_post_id and user_id = p_user_id
  returning to_jsonb(posts.*) into result_post;

  -- Check if post was found and belongs to the user
  if result_post is null then
    raise exception 'Post not found or unauthorized';
  end if;

  -- Delete all existing hashtag relationships for this post
  delete from post_hashtags where post_id = p_post_id;

  -- Process new hashtags if any exist
  if array_length(p_hashtags, 1) > 0 then
    foreach hashtag_name in array p_hashtags loop
      -- Insert hashtag and fetch id
      insert into hashtags (name)
      values (hashtag_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_hashtag_id;

      -- Insert the post-hashtag relationship
      insert into post_hashtags (post_id, hashtag_id)
      values (p_post_id, v_hashtag_id)
      on conflict (post_id, hashtag_id) do nothing;
    end loop;
  end if;

  return result_post;
end;
$$;

create or replace function public.create_post_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
  insert into public.post_stats (post_id) values (NEW.id);
  return NEW;
end;
$$;

create
or replace trigger trigger_create_post_stats
after insert on public.posts for each row
execute function public.create_post_stats ();


create or replace function public.get_post_stats_batch (p_post_ids bigint[], p_current_user_id uuid) returns table (
  post_id text,
  likes_count bigint,
  comments_count bigint,
  reposts_count bigint,
  bookmarks_count bigint,
  is_liked boolean,
  is_bookmarked boolean
) language sql
set
  search_path = public as $$
  select 
    ps.post_id::text,
    ps.likes_count,
    ps.comments_count,
    ps.reposts_count,
    ps.bookmarks_count,
    (pl.user_id is not null) as is_liked,
    (pb.user_id is not null) as is_bookmarked
  from post_stats ps
  -- Is liked
  left join post_likes pl
    on pl.post_id = ps.post_id and pl.user_id = p_current_user_id
  -- Is bookmarked
  left join post_bookmarks pb
    on pb.post_id = ps.post_id and pb.user_id = p_current_user_id
  where ps.post_id = any(p_post_ids);
$$;


-- Function to get explore posts with advanced scoring algorithm
create or replace function public.get_explore_posts (
  p_current_user_id uuid,
  p_excluded_user_ids uuid[],
  p_post_type text default 'post',
  p_limit integer default 30,
  p_offset integer default 0,
  p_trending jsonb default null
) returns table (
  post_id text,
  user_id uuid,
  text text,
  attachments jsonb[],
  privacy smallint,
  created_at timestamp with time zone,
  last_modified timestamp with time zone,
  explore_score numeric
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
      coalesce((p_trending->>ph.hashtag_id::text)::numeric, 0.0) as trending_score
    from post_hashtags ph
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
      p.id::text as post_id,
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
      ) as explore_score
    from posts p
    left join post_engagement pe on p.id = pe.post_id
    left join post_trending_scores pt on p.id = pt.post_id
    where p.user_id not in (select excluded_id from excluded_users)
      and p.privacy = 0 -- Only public posts
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
    ep.explore_score
  from explore_posts ep
  order by ep.explore_score desc, ep.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- Insert version of increment_post_stat
create or replace function public.increment_post_stat (
  p_post_id bigint,
  p_field text,
  p_increment integer
) returns bigint language plpgsql
set
  search_path = public as $$
declare
  result bigint;
begin
  if p_field not in ('likes_count', 'comments_count', 'reposts_count', 'bookmarks_count') then
    raise exception 'Invalid field name: %', p_field;
  end if;

  execute format(
    'update post_stats
     set %I = COALESCE(%I, 0) + $1,
         last_modified = NOW()
     where post_id = $2
     returning %I',
    p_field, p_field, p_field
  )
  into result
  using p_increment, p_post_id;

  return result;
end;
$$;

-- Upsert version of increment_post_stat
create or replace function public.increment_post_stat (
  p_post_id bigint,
  p_field text,
  p_increment integer
) returns bigint language plpgsql
set
  search_path = public as $$
declare
  result bigint;
begin
  if p_field not in ('likes_count', 'comments_count', 'reposts_count', 'bookmarks_count') then
    raise exception 'Invalid field name: %', p_field;
  end if;

  execute format(
    'insert into post_stats (post_id, %I, last_modified)
       values ($1, $2, now())
     on conflict (post_id) do update
       set %I = post_stats.%I + $2,
           last_modified = now()
     returning %I',
    p_field, p_field, p_field, p_field
  )
  into result
  using p_post_id, p_increment;

  return result;
end;
$$;
