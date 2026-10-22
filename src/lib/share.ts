import { createClient } from "@/lib/supabase/client";

export type ShareKind = "song" | "post";

// Anrejistre yon pataj (navigatè sèlman). Yon menm moun konte yon fwa pa chante/pòs nan yon sesyon,
// pou kontè a pa monte chak fwa l peze bouton an. Retounen nouvo total la, oswa null si l pa konte.
export async function recordShare(kind: ShareKind, id: string): Promise<number | null> {
  const key = `upmizik-share:${kind}:${id}`;
  try {
    if (sessionStorage.getItem(key)) return null;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage bloke (mòd prive...): nou konte l kanmenm
  }
  const { data, error } = await createClient().rpc("record_share", { p_kind: kind, p_id: id });
  if (error) return null;
  return Number(data ?? 0);
}

// Pataje yon lyen: meni pataj telefòn nan, oswa kopye lyen an. Retounen "shared", "copied" oswa null (anile).
export async function shareLink(path: string, title: string, text?: string): Promise<"shared" | "copied" | null> {
  const url = `${window.location.origin}${path}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return null; // moun nan fèmen meni pataj la
  }
}
