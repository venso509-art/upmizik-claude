"use client";

import type { Track } from "@/components/player/PlayerProvider";

// Tout mizik offline yo sere nan Cache Storage navigatè a:
//  - fichye odyo a ak imaj la, anba pwòp URL yo
//  - enfòmasyon chante a (tit, atis...) anba /__offline__/<id>
const CACHE = "upmizik-offline-v1";
const META_PREFIX = "/__offline__/";

// Evènman ki di rès sit la (lektè a, bouton yo) lis mizik offline la chanje
export const OFFLINE_EVENT = "upmizik-offline-changed";
const notifyChange = () => window.dispatchEvent(new Event(OFFLINE_EVENT));

export type OfflineSong = Track & { savedAt: string; bytes: number };

function supported() {
  return typeof window !== "undefined" && "caches" in window;
}

const metaKey = (id: string) => `${META_PREFIX}${id}`;

export async function isSavedOffline(id: string) {
  if (!supported()) return false;
  const cache = await caches.open(CACHE);
  return Boolean(await cache.match(metaKey(id)));
}

export async function saveOffline(track: Track, onProgress?: (fraction: number) => void) {
  if (!supported()) throw new Error("Navigatè sa a pa sipòte mizik offline.");
  const cache = await caches.open(CACHE);

  // Telechaje odyo a pa moso, pou n ka montre pwogrè a
  const res = await fetch(track.audioUrl, { mode: "cors" });
  if (!res.ok || !res.body) throw new Error("Telechajman an echwe.");
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress?.(received / total);
  }
  const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("content-type") ?? "audio/mpeg" });
  await cache.put(track.audioUrl, new Response(blob, { headers: { "content-type": blob.type } }));

  if (track.coverUrl) {
    const cover = await fetch(track.coverUrl, { mode: "cors" }).catch(() => null);
    if (cover?.ok) await cache.put(track.coverUrl, cover);
  }

  const meta: OfflineSong = { ...track, savedAt: new Date().toISOString(), bytes: blob.size };
  await cache.put(metaKey(track.id), new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
  notifyChange();
}

export async function removeOffline(track: Pick<Track, "id" | "audioUrl" | "coverUrl">) {
  if (!supported()) return;
  const cache = await caches.open(CACHE);
  await Promise.all([
    cache.delete(metaKey(track.id)),
    cache.delete(track.audioUrl),
    track.coverUrl ? cache.delete(track.coverUrl) : Promise.resolve(false),
  ]);
  notifyChange();
}

export async function listOffline(): Promise<OfflineSong[]> {
  if (!supported()) return [];
  const cache = await caches.open(CACHE);
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith(META_PREFIX));
  const songs = await Promise.all(keys.map(async (k) => (await cache.match(k))?.json() as Promise<OfflineSong>));
  return songs.filter(Boolean).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// Retounen yon URL lokal (blob:) pou yon fichye ki sove, oswa null
export async function offlineObjectUrl(url: string | null) {
  if (!url || !supported()) return null;
  const res = await (await caches.open(CACHE)).match(url);
  return res ? URL.createObjectURL(await res.blob()) : null;
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
