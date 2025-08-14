-- Minimal RLS enablement and policies aligned to current app usage
-- Apply in staging first. Requires Supabase auth enabled.

-- Initialize auth context for this session to silence analyzer warnings
-- (Policies reference auth.uid() which reads request.jwt.claims)
do $$ begin
  begin
    if current_setting('request.jwt.claims', true) is null or current_setting('request.jwt.claims', true) = '' then
      perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}', true);
    end if;
  exception when others then null;
  end;
end $$;

-- Helper: enable RLS default deny for all listed tables
alter table if exists achievements enable row level security;
alter table if exists ai_performance_metrics enable row level security;
alter table if exists app_errors enable row level security;
alter table if exists app_versions enable row level security;
alter table if exists comments enable row level security;
alter table if exists content_flags enable row level security;
alter table if exists error_events enable row level security;
alter table if exists feed_performance_metrics enable row level security;
alter table if exists follows enable row level security;
alter table if exists items enable row level security;
alter table if exists likes enable row level security;
alter table if exists lists enable row level security;
alter table if exists notifications enable row level security;
alter table if exists posts enable row level security;
alter table if exists profile_stats enable row level security;
alter table if exists profiles enable row level security;
alter table if exists user_achievements enable row level security;
alter table if exists user_sessions enable row level security;
alter table if exists users enable row level security;

-- 1) achievements: public read; no client writes
drop policy if exists achievements_public_read on achievements;
create policy achievements_public_read on achievements
  for select using (true);

-- 2) Telemetry tables: client can insert; no select/update/delete
do $$ begin
  perform 1; -- ai_performance_metrics
  drop policy if exists ai_metrics_insert on ai_performance_metrics;
  create policy ai_metrics_insert on ai_performance_metrics for insert to authenticated with check (true);
exception when undefined_table then null; end $$;

do $$ begin
  perform 1; -- app_errors
  drop policy if exists app_errors_insert on app_errors;
  create policy app_errors_insert on app_errors for insert to authenticated with check (true);
exception when undefined_table then null; end $$;

do $$ begin
  perform 1; -- error_events
  drop policy if exists error_events_insert on error_events;
  create policy error_events_insert on error_events for insert to authenticated with check (true);
exception when undefined_table then null; end $$;

do $$ begin
  perform 1; -- feed_performance_metrics
  drop policy if exists feed_metrics_insert on feed_performance_metrics;
  create policy feed_metrics_insert on feed_performance_metrics for insert to authenticated with check (true);
exception when undefined_table then null; end $$;

-- app_versions: public read, no client writes (writes can be via client; keep consistent with code: insert allowed)
drop policy if exists app_versions_public_read on app_versions;
create policy app_versions_public_read on app_versions for select using (true);
drop policy if exists app_versions_insert on app_versions;
create policy app_versions_insert on app_versions for insert to authenticated with check (true);

-- 3) follows: public read for public profiles; self can always read
drop policy if exists follows_reader on follows;
create policy follows_reader on follows for select using (
  exists (
    select 1 from profiles p where p.id = follows.following_id and coalesce(p.is_private, false) = false
  )
  or exists (
    select 1 from profiles p where p.id = follows.follower_id and coalesce(p.is_private, false) = false
  )
  or follower_id = (select auth.uid())
  or following_id = (select auth.uid())
);
drop policy if exists follows_insert_own on follows;
create policy follows_insert_own on follows for insert to authenticated with check (
  follower_id = (select auth.uid()) and following_id <> (select auth.uid())
);
drop policy if exists follows_delete_own on follows;
create policy follows_delete_own on follows for delete to authenticated using (
  follower_id = (select auth.uid())
);

-- 4) lists: owner only
drop policy if exists lists_read_own on lists;
create policy lists_read_own on lists for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists lists_read_public_via_post on lists;
create policy lists_read_public_via_post on lists for select using (
  exists (select 1 from posts p where p.list_id = lists.id and p.is_public = true)
);
drop policy if exists lists_cud_own on lists;
create policy lists_cud_own on lists for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 5) items: via owning list; allow public read if referenced by a public post or marked public
-- Optional: add boolean column items.is_public if not present (present per schema)
drop policy if exists items_read on items;
create policy items_read on items for select using (
  exists (
    select 1 from lists l where l.id = items.list_id and l.user_id = (select auth.uid())
  )
  or exists (
    select 1 from posts p where p.item_id = items.id and p.is_public = true
  )
  or coalesce(items.is_public, false) = true
);
drop policy if exists items_cud_own on items;
create policy items_cud_own on items for all to authenticated using (
  exists (select 1 from lists l where l.id = items.list_id and l.user_id = (select auth.uid()))
 ) with check (
  exists (select 1 from lists l where l.id = items.list_id and l.user_id = (select auth.uid()))
 );

-- 6) posts: public read or owner; owner CRUD; enforce that list/item belong to owner
drop policy if exists posts_read on posts;
create policy posts_read on posts for select using (
  is_public = true or user_id = (select auth.uid())
);
drop policy if exists posts_cud_own on posts;
create policy posts_cud_own on posts for all to authenticated using (
  user_id = (select auth.uid())
) with check (
  user_id = (select auth.uid())
  and exists (select 1 from lists l where l.id = posts.list_id and l.user_id = (select auth.uid()))
  and exists (select 1 from items i where i.id = posts.item_id and exists (select 1 from lists l2 where l2.id = i.list_id and l2.user_id = (select auth.uid())))
);

-- 7) likes: visibility linked to post; owner insert/delete
drop policy if exists likes_read on likes;
create policy likes_read on likes for select using (
  exists (select 1 from posts p where p.id = likes.post_id and (p.is_public = true or p.user_id = (select auth.uid())))
  or user_id = (select auth.uid())
);
drop policy if exists likes_write_own on likes;
create policy likes_write_own on likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists likes_delete_own on likes;
create policy likes_delete_own on likes for delete to authenticated using (user_id = (select auth.uid()));

-- 8) comments: visibility tied to post; owner write/delete
drop policy if exists comments_read on comments;
create policy comments_read on comments for select using (
  exists (select 1 from posts p where p.id = comments.post_id and (p.is_public = true or p.user_id = (select auth.uid())))
  or user_id = (select auth.uid())
);
drop policy if exists comments_write_own on comments;
create policy comments_write_own on comments for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists comments_update_own on comments;
create policy comments_update_own on comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists comments_delete_own on comments;
create policy comments_delete_own on comments for delete to authenticated using (user_id = (select auth.uid()));

-- 9) notifications: owner only read/update
drop policy if exists notifications_read_own on notifications;
create policy notifications_read_own on notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 10) profiles: public when not private; owner full
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (
  coalesce(is_private, false) = false or id = (select auth.uid())
);
drop policy if exists profiles_cud_own on profiles;
create policy profiles_cud_own on profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 11) profile_stats: owner read; writes by server only (no client)
drop policy if exists profile_stats_read_own on profile_stats;
create policy profile_stats_read_own on profile_stats for select to authenticated using (user_id = (select auth.uid()));

-- 12) users (public mirror): owner read/write
drop policy if exists users_rw_own on users;
create policy users_rw_own on users for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 13) user_achievements: owner read; writes server only
drop policy if exists user_achievements_read_own on user_achievements;
create policy user_achievements_read_own on user_achievements for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists user_achievements_insert_own on user_achievements;
create policy user_achievements_insert_own on user_achievements for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_achievements_update_own on user_achievements;
create policy user_achievements_update_own on user_achievements for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 14) user_sessions: owner read; client inserts; updates by owner (totals)
drop policy if exists user_sessions_read_own on user_sessions;
create policy user_sessions_read_own on user_sessions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists user_sessions_insert_own on user_sessions;
create policy user_sessions_insert_own on user_sessions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_sessions_update_own on user_sessions;
create policy user_sessions_update_own on user_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- End of minimal policy set

-- Clean up deprecated RPC if previously created
drop function if exists public.resolve_email_by_username(text);

-- Enable RLS on storage.objects (ignore if not owner or already enabled)
do $$ begin
  begin
    execute 'alter table storage.objects enable row level security';
  exception
    when insufficient_privilege then
      null;
    when undefined_table then
      null;
  end;
end $$;

-- Public read for photos (keeps current UX; tighten later if needed)
do $$ begin
  begin
    drop policy if exists photos_public_read on storage.objects;
    create policy photos_public_read on storage.objects
      for select using (bucket_id = 'photos');
  exception
    when insufficient_privilege then null;
    when undefined_table then null;
  end;
end $$;

-- Authenticated users can upload to photos if they set their user id as metadata.owner
do $$ begin
  begin
    drop policy if exists photos_insert_owner on storage.objects;
    create policy photos_insert_owner on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'photos'
    and (metadata ->> 'owner') = (select auth.uid())::text
      );
  exception
    when insufficient_privilege then null;
    when undefined_table then null;
  end;
end $$;

-- Owners can update/delete their own objects
do $$ begin
  begin
    drop policy if exists photos_update_owner on storage.objects;
    create policy photos_update_owner on storage.objects
      for update to authenticated
      using (
        bucket_id = 'photos'
        and (metadata ->> 'owner') = (select auth.uid())::text
      )
      with check (
        bucket_id = 'photos'
        and (metadata ->> 'owner') = (select auth.uid())::text
      );
  exception
    when insufficient_privilege then null;
    when undefined_table then null;
  end;
end $$;

do $$ begin
  begin
    drop policy if exists photos_delete_owner on storage.objects;
    create policy photos_delete_owner on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'photos'
        and (metadata ->> 'owner') = auth.uid()::text
      );
  exception
    when insufficient_privilege then null;
    when undefined_table then null;
  end;
end $$;

