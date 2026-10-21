-- 🎤 Paj atis "CV": lyen TikTok ak WhatsApp sou pwofil la (YouTube ak Instagram te deja la).
-- Foto kouvèti a se kolòn banner_url ki deja egziste a.

alter table public.profiles
  add column tiktok_url   text check (tiktok_url ~ '^https://' and char_length(tiktok_url) <= 300),
  add column whatsapp_url text check (whatsapp_url ~ '^https://wa\.me/[0-9]{8,15}$');
