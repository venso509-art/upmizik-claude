import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveRoom } from "@/components/live/LiveRoom";
import { LIVE_COLUMNS, formatCount, liveDuration, type GiftType, type LiveGuest, type LiveMessage, type LiveRow } from "@/lib/live";

type Props = { params: { id: string } };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!UUID_RE.test(params.id)) return { title: "Live | UpMizik" };
  const supabase = createClient();
  const { data: live } = await supabase.from("lives").select("artist_id, title").eq("id", params.id).maybeSingle();
  const { data: a } = live ? await supabase.from("profiles").select("display_name, avatar_url").eq("id", live.artist_id).maybeSingle() : { data: null };
  const title = `🔴 ${a?.display_name ?? "Live"} an live sou UpMizik`;
  return { title, description: live?.title ?? "Vin gade live la, like epi voye yon kado!", openGraph: { title, images: [{ url: a?.avatar_url ?? "/og.jpg" }] } };
}

// Salkèl live la
export default async function LivePage({ params }: Props) {
  if (!UUID_RE.test(params.id)) notFound();
  const supabase = createClient();
  const [{ data: live }, { data: { user } }, { data: gifts }] = await Promise.all([
    supabase.from("lives").select(LIVE_COLUMNS).eq("id", params.id).maybeSingle<LiveRow>(),
    supabase.auth.getUser(),
    supabase.from("live_gift_types").select("id, name, emoji, credits, sort").eq("active", true).order("sort").returns<GiftType[]>(),
  ]);
  if (!live) notFound();

  const { data: artist } = await supabase.from("profiles").select("id, display_name, avatar_url, is_verified").eq("id", live.artist_id).maybeSingle();
  const artistInfo = { id: live.artist_id, name: artist?.display_name ?? "Atis", avatarUrl: artist?.avatar_url ?? null, verified: !!artist?.is_verified };

  // Live ki fini: ti rezime piblik
  if (live.status !== "live") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl">🎬</p>
        <h1 className="mt-4 text-2xl font-extrabold text-white">Live {artistInfo.name} a fini</h1>
        <p className="mt-2 text-zinc-400">
          {liveDuration(live.started_at, live.ended_at)} · ❤️ {formatCount(live.likes)} like · 🎁 {formatCount(live.gifts_count)} kado
        </p>
        <Link href={`/atis/${artistInfo.id}`} className="btn-primary mt-6 inline-block rounded-full px-6 py-3">
          Wè pwofil {artistInfo.name}
        </Link>
      </div>
    );
  }

  const [{ data: me }, { data: messages }, { data: guests }, { data: wallet }, { data: capacity }] = await Promise.all([
    user ? supabase.from("profiles").select("id, display_name, role, status").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("live_messages").select("id, live_id, user_id, sender_name, body, created_at").eq("live_id", live.id).order("created_at", { ascending: false }).limit(30).returns<LiveMessage[]>(),
    supabase.from("live_guests").select("id, live_id, user_id, guest_name, status, created_at").eq("live_id", live.id).in("status", ["requested", "accepted"]).returns<LiveGuest[]>(),
    user ? supabase.from("credit_wallets").select("balance").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("live_capacity", { p_live: live.id }),
  ]);

  return (
    <LiveRoom
      live={live}
      artist={artistInfo}
      me={me ? { id: me.id, name: me.display_name, isArtist: me.role === "artist" && me.status === "approved" } : null}
      gifts={gifts ?? []}
      initialMessages={(messages ?? []).reverse()}
      initialGuests={guests ?? []}
      initialBalance={wallet?.balance ?? 0}
      initialCapacity={typeof capacity === "number" ? capacity : 1}
    />
  );
}
