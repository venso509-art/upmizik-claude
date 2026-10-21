-- 🚀 RPA: aksepte imaj (GIF, JPG, PNG, WebP) ak videyo MOV, anplis MP4/WebM ak YouTube.
-- Fichye yo rete nan bucket "promo-videos" (kolòn video_path la sèvi pou tout fichye).

alter type public.promo_kind add value if not exists 'image';

-- Ansyen règ la te konnen sèlman 'video' ak 'youtube'.
-- (kind::text pou nou pa itilize nouvo valè 'image' la nan menm tranzaksyon an)
alter table public.artist_promos drop constraint if exists artist_promos_check;
alter table public.artist_promos add constraint artist_promos_media_check check (
  (kind::text in ('video', 'image') and video_path is not null)
  or (kind::text = 'youtube' and youtube_url is not null)
);

-- Bucket la: 50 MB maks, videyo + imaj
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'video/mp4', 'video/webm', 'video/quicktime',
      'image/gif', 'image/jpeg', 'image/png', 'image/webp'
    ]
where id = 'promo-videos';
