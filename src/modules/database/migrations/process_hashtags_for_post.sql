create or replace function process_hashtags_for_post (p_post_id UUID, p_hashtags text[]) RETURNS VOID LANGUAGE plpgsql as $$
DECLARE
  v_hashtag_name TEXT;
  v_hashtag_id INTEGER; -- Renamed from hashtag_id
BEGIN
  FOREACH v_hashtag_name IN ARRAY p_hashtags
  LOOP
    -- Insert hashtag if it doesn't exist
    INSERT INTO hashtags (name, created_at)
    VALUES (v_hashtag_name, NOW())
    ON CONFLICT (name) DO NOTHING;
    
    -- Get the hashtag ID explicitly
    SELECT h.id INTO v_hashtag_id
    FROM hashtags h
    WHERE h.name = v_hashtag_name;
    
    -- Link hashtag to post
    INSERT INTO post_hashtags (post_id, hashtag_id)
    VALUES (p_post_id, v_hashtag_id)
    ON CONFLICT (post_id, hashtag_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Successfully processed % hashtags for post %', array_length(p_hashtags, 1), p_post_id;
END;
$$;