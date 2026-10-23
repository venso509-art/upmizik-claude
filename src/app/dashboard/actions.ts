"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeGenre } from "@/lib/genres";
import { normalizeUrl } from "@/lib/links";
import { MAX_SPLITS, validateSplits, type Split } from "@/lib/splits";
import { PRO_MAX_SPLITS } from "@/lib/pro";

export type SongActionResult = { error?: string };

// Chache chante a SÈLMAN si li pou itilizatè ki konekte a
async function getOwnSong(songId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, song: null };

  const { data: song } = await supabase
    .from("songs")
    .select("id, artist_id, audio_path, cover_path")
    .eq("id", songId)
    .eq("artist_id", user.id)
    .maybeSingle();

  return { supabase, user, song };
}

// Erè sa yo vle di yon migration SQL poko kouri (kolòn oswa tablo ki manke)
function friendlyDbError(prefix: string, error: { code?: string; message: string }) {
  if (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205" || error.code === "PGRST202") {
    return `${prefix}: baz done a poko ajou. Kouri dènye fichye SQL ki nan supabase/migrations nan SQL Editor Supabase la.`;
  }
  return `${prefix}: ${error.message}`;
}

function refresh(artistId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/atis/${artistId}`);
  revalidatePath("/albom/[id]", "page");
}

export type FeaturingInput = { artistId: string; percentage: number };

// Featuring chante a (pou fenèt Modifye a): RLS la kite sèlman owner a li yo
export async function getSongFeaturing(songId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("song_artists")
    .select("artist_id, split_percentage, created_at, profiles!song_artists_artist_id_fkey(display_name, avatar_url, is_verified)")
    .eq("song_id", songId)
    .order("created_at");
  type P = { display_name: string; avatar_url: string | null; is_verified: boolean };
  return ((data ?? []) as { artist_id: string; split_percentage: number; profiles: P | P[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      artistId: r.artist_id,
      name: p?.display_name ?? "Atis",
      avatarUrl: p?.avatar_url ?? null,
      verified: p?.is_verified ?? false,
      percentage: Number(r.split_percentage),
    };
  });
}

export async function updateSong(
  songId: string,
  input: {
    title: string;
    genre: string;
    youtubeUrl: string;
    splits: Split[];
    featuring?: FeaturingInput[];
    release?: { kind: "single" | "ep" | "mixtape" | "album"; releaseId: string | null; newTitle: string; trackNumber: number | null };
  },
): Promise<SongActionResult> {
  const cleanTitle = input.title.trim();
  if (!cleanTitle || cleanTitle.length > 200) return { error: "Tit la dwe gen ant 1 ak 200 karaktè." };
  const genre = normalizeGenre(input.genre);
  if (genre === undefined) return { error: "Jan mizik la pa valid (2 a 40 lèt)." };
  const youtubeUrl = normalizeUrl(input.youtubeUrl);
  if (youtubeUrl === undefined) return { error: "Lyen YouTube la pa valid." };
  const splitsError = validateSplits(input.splits, PRO_MAX_SPLITS);
  if (splitsError) return { error: splitsError };

  const { supabase, user, song } = await getOwnSong(songId);
  if (!user) return { error: "Ou dwe konekte." };
  if (!song) return { error: "Chante sa a pa egziste oswa li pa pou ou." };
  // Plis pase 5 kolaboratè: se pou atis Pro yo sèlman
  if (input.splits.length > MAX_SPLITS && (await supabase.rpc("is_pro", { p_user: user.id })).data !== true) {
    return { error: `Ou ka ajoute maksimòm ${MAX_SPLITS} kolaboratè. Atis Pro yo ka mete jiska ${PRO_MAX_SPLITS}.` };
  }

  const { error } = await supabase
    .from("songs")
    .update({ title: cleanTitle, genre, youtube_url: youtubeUrl })
    .eq("id", songId);
  if (error) return { error: friendlyDbError("Modifikasyon an echwe", error) };

  if (input.featuring) {
    const totalShares =
      input.featuring.reduce((s, f) => s + (Number(f.percentage) || 0), 0) + input.splits.reduce((s, x) => s + (Number(x.percentage) || 0), 0);
    if (totalShares > 100) return { error: "Total pousantaj yo (featuring + kolaboratè) depase 100%." };
  }

  // Lòd la enpòtan: nou vide featuring yo anvan, pou baz done a pa refize kolaboratè yo
  // pandan owner a ap deplase pousantaj soti nan youn pou ale nan lòt.
  const previous = input.featuring ? await getSongFeaturing(songId) : [];
  const toRpc = (list: FeaturingInput[]) => list.map((f) => ({ artist_id: f.artistId, percentage: Number(f.percentage) || 0 }));
  if (input.featuring) {
    const { error: clearErr } = await supabase.rpc("set_song_artists", { p_song_id: songId, p_artists: [] });
    if (clearErr) return { error: friendlyDbError("Featuring yo pa sove", clearErr) };
  }

  const { error: rpcError } = await supabase.rpc("set_song_splits", { p_song_id: songId, p_splits: input.splits });
  if (rpcError) {
    if (input.featuring) await supabase.rpc("set_song_artists", { p_song_id: songId, p_artists: toRpc(previous) });
    return { error: friendlyDbError("Pataj royalties la pa sove", rpcError) };
  }

  if (input.featuring) {
    const { error: featErr } = await supabase.rpc("set_song_artists", { p_song_id: songId, p_artists: toRpc(input.featuring) });
    if (featErr) {
      // Remete ansyen featuring yo pou pèsonn pa pèdi pa l
      await supabase.rpc("set_song_artists", { p_song_id: songId, p_artists: toRpc(previous) });
      return { error: friendlyDbError("Featuring yo pa sove", featErr) };
    }
  }

  // Piblikasyon: Single (okenn), oswa yon EP / Mixtape / Album (ki egziste deja oswa nouvo)
  if (input.release) {
    const r = input.release;
    let releaseId: string | null = null;
    if (r.kind !== "single") {
      if (r.releaseId) releaseId = r.releaseId;
      else {
        const title = r.newTitle.trim();
        if (!title || title.length > 120) return { error: "Mete non piblikasyon an (1 a 120 karaktè)." };
        const { data: created } = await supabase.from("releases").insert({ artist_id: user.id, title, kind: r.kind }).select("id").maybeSingle();
        if (created) releaseId = created.id;
        else {
          // Li deja egziste ak menm non an: pran li
          const { data: same } = await supabase.from("releases").select("id").eq("artist_id", user.id).eq("kind", r.kind).eq("title", title).maybeSingle();
          if (!same) return { error: "Piblikasyon an pa kreye." };
          releaseId = same.id;
        }
      }
    }
    const track = releaseId && r.trackNumber && r.trackNumber >= 1 && r.trackNumber <= 99 ? Math.floor(r.trackNumber) : null;
    // Baz done a verifye piblikasyon an se pou atis la, epi l mete nimewo a otomatikman si l vid
    const { error: relErr } = await supabase.from("songs").update({ release_id: releaseId, track_number: track }).eq("id", songId);
    if (relErr) return { error: friendlyDbError("Piblikasyon an pa sove", relErr) };
  }

  refresh(user.id);
  return {};
}

export async function getSongSplits(songId: string): Promise<Split[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("song_splits")
    .select("collaborator_name, collaborator_role, collaborator_email, collaborator_phone, collaborator_method, percentage")
    .eq("song_id", songId)
    .order("created_at");
  return (data ?? []).map((s) => ({
    name: s.collaborator_name,
    role: s.collaborator_role,
    email: s.collaborator_email ?? "",
    phone: s.collaborator_phone ?? "",
    method: (s.collaborator_method ?? "") as Split["method"],
    percentage: Number(s.percentage),
  }));
}

export async function deleteSong(songId: string): Promise<SongActionResult> {
  const { supabase, user, song } = await getOwnSong(songId);
  if (!user) return { error: "Ou dwe konekte." };
  if (!song) return { error: "Chante sa a pa egziste oswa li pa pou ou." };

  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) return { error: `Efasman an echwe: ${error.message}` };

  // Efase fichye yo nan depo a tou, pou yo pa pran plas pou granmesi
  await supabase.storage.from("audio").remove([song.audio_path]);
  if (song.cover_path) await supabase.storage.from("covers").remove([song.cover_path]);

  refresh(user.id);
  return {};
}
