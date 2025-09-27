create or replace function public.create_post_with_hashtags (
  p_user_id uuid,
  p_text text,
  p_attachments jsonb[],
  p_privacy smallint,
  p_hashtags text[]
) returns jsonb
language plpgsql
set search_path = public
as $$
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
