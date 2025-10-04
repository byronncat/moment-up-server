create or replace function public.create_comment_stats () returns trigger language plpgsql
set
  search_path = public as $$
begin
    insert into public.comment_stats (comment_id) values (new.id);
    
    -- Insert: increment post comments count
    -- update post_stats 
    -- set comments_count = coalesce(comments_count, 0) + 1,
    --     last_modified = now()
    -- where post_id = new.post_id;
    -- Upsert: increment post comments count with upsert
    insert into post_stats (post_id, comments_count, last_modified)
    values (new.post_id, 1, now())
    on conflict (post_id) do update
    set comments_count = coalesce(post_stats.comments_count, 0) + 1,
        last_modified = now();
    
    return new;
end;
$$;

create trigger trigger_create_comment_stats
after insert on public.comments for each row
execute function public.create_comment_stats ();

create or replace function public.increment_comment_stat (
  p_comment_id text,
  p_field text,
  p_increment integer
) returns bigint language plpgsql
set
  search_path = public as $$
declare
    result bigint;
begin
  if p_field not in ('likes_count') then
     raise exception 'invalid field name: %', p_field;
  end if;
  execute format(
      'insert into comment_stats (comment_id, %I, last_modified)
      values ($1::bigint, $2, now())
      on conflict (comment_id) do update
      set %I = comment_stats.%I + $2,
          last_modified = now()
      returning %I',
      p_field, p_field, p_field, p_field
)
into result
using p_comment_id::bigint, p_increment;

return result;
end;
$$;

create or replace function public.get_comments_with_stats (
  p_post_id text,
  p_current_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_sort_by text default 'newest'
) returns table (
  id text,
  user_id uuid,
  text text,
  likes_count bigint,
  is_liked boolean,
  created_at timestamptz,
  last_modified timestamptz
) language plpgsql
set
  search_path = public as $$
declare
    order_clause text;
begin
     return query execute format('
         select
             c.id::text,
             c.user_id,
             c.text,
             coalesce(cs.likes_count, 0) as likes_count,
             (cl.user_id is not null) as is_liked,
             c.created_at,
             c.last_modified
         from comments c
         left join comment_stats cs on cs.comment_id = c.id
         left join comment_likes cl on cl.comment_id = c.id and cl.user_id = %L
         where c.post_id = %L
         order by (c.user_id = %L) desc, %s, c.id desc
         limit %L
         offset %L',
         p_current_user_id, p_post_id, p_current_user_id,
         case p_sort_by
             when 'most_liked' then 'coalesce(cs.likes_count, 0) desc, c.last_modified desc'
             else 'c.last_modified desc'
         end, p_limit, p_offset
     );
end;
$$;