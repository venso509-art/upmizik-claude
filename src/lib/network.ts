// Èd pou entènèt ki koupe oswa ki fèb (gade OfflineNotification).

// Evènman pou di notifikasyon an "yon bagay pa t ka chaje" (egz: paj erè a)
export const NETWORK_ERROR_EVENT = "upmizik:network-error";

// Erè ki soti nan rezo a, pa nan kòd la: fichye JS ki pa chaje, fetch ki echwe...
export function isNetworkError(error: unknown) {
  if (!error) return false;
  const e = error as { name?: string; message?: string };
  const text = `${e.name ?? ""} ${e.message ?? String(error)}`;
  return /ChunkLoadError|Loading (CSS )?chunk|Failed to fetch|NetworkError|Load failed|network error/i.test(text);
}

// Èske sèvè UpMizik la reponn vre? (navigator.onLine ka di "wi" menm lè rezo a twò fèb)
export async function pingServer(timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/ping?t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Paj erè yo rele sa: montre notifikasyon an, epi rechaje paj la lè entènèt la tounen
export function reportNetworkError() {
  window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));
}
