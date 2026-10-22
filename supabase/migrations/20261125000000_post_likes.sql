-- ❤️ Like sou pòs Sosyal yo (menm jan ak like chante yo ak like kòmantè yo)

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "Like pòs vizib pou tout moun" on public.post_likes for select using (true);
create policy "Itilizatè like pòs pou tèt li" on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Itilizatè retire pwòp like pòs li" on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);
