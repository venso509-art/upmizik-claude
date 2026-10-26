"use client";

import { createClient } from "@/lib/supabase/client";

// ===== NOTIFIKASYON PUSH (navigatè a) =====
// Aktive: telefòn nan bay otorizasyon → service worker la abone ak kle piblik VAPID la → nou sove l nan push_subscriptions.

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  // iPhone: push mache SÈLMAN lè app la enstale sou ekran akèy la (iOS 16.4+)
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyToBytes(key: string) {
  const pad = "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Ou pa bay otorizasyon an. Ou ka chanje sa nan paramèt telefòn ou." };
    const { key } = (await (await fetch("/api/push/key", { cache: "no-store" })).json()) as { key: string | null };
    if (!key) return { ok: false, error: "Notifikasyon push poko pare sou sèvè a." };
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Konekte anvan." };
    const { error } = await supabase.from("push_subscriptions").insert({ user_id: user.id, endpoint: sub.endpoint, user_agent: navigator.userAgent.slice(0, 300) });
    // Deja anrejistre (menm aparèy la): pa gen pwoblèm
    if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Notifikasyon yo pa aktive." };
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
