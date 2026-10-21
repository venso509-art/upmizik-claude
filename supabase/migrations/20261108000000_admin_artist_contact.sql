-- =====================================================================
-- UpMizik: admin nan ka wè imèl ak telefòn atis yo pou kontakte yo manyèlman
-- (telefòn nan rete nan tablo prive artist_private; sèlman admin ka li l isit la)
-- =====================================================================

create function public.admin_artist_contacts()
returns table (artist_id uuid, email text, phone text)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, u.email::text, ap.phone
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.artist_private ap on ap.user_id = p.id
  where p.role = 'artist' and public.is_admin();
$$;

revoke execute on function public.admin_artist_contacts() from public, anon;
grant execute on function public.admin_artist_contacts() to authenticated;
