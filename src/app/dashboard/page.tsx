import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, getSongExtras, toTrack, type SongRow } from "@/lib/songs";
import { AuthCard } from "@/components/auth/ui";
import { AccountStatusNotice } from "@/components/AccountStatusNotice";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { RegistrationPanel } from "@/components/registration/RegistrationPanel";
import { LevelsCard } from "@/components/dashboard/LevelsCard";
import { toBalance, type BalanceRow } from "@/lib/finance";
import { BarChart, type BarDatum } from "@/components/dashboard/BarChart";
import { SongManager, type ManagedSong } from "@/components/dashboard/SongManager";
import { PostComposer, type MyPost } from "@/components/social/PostComposer";
import { StatusComposer } from "@/components/status/StatusComposer";
import { DailyQuoteStudio } from "@/components/quotes/DailyQuoteStudio";
import { ArtistCockpit } from "@/components/dashboard/ArtistCockpit";
import type { QuoteTemplate } from "@/lib/dailyQuotes";
import { postImageUrl } from "@/lib/posts";
import { donateShareText } from "@/lib/shareMessages";
import { BoostBox, type BoostHistoryItem } from "@/components/boost/BoostBox";
import { isBoostActive, type BoostPlan, type BoostStatus, type BoostType } from "@/lib/boost";

export const metadata: Metadata = { title: "Dashboard | UpMizik" };

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Port-au-Prince" }));
  if (hour < 12) return "Bonjou";
  if (hour < 18) return "Bon apremidi";
  return "Bonswa";
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("display_name, role, status, is_verified, avatar_url").eq("id", user.id).single();
  if (profile?.role !== "artist") {
    return (
      <AuthCard title="Dashboard la se pou atis" subtitle="Kont ou se yon kont koutè.">
        <p className="text-zinc-300">
          Se sèlman atis ki gen yon dashboard. Ou ka kontinye koute tout chante yo sou{" "}
          <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300">
            paj akèy la
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  // Espas atis la louvri SÈLMAN apre admin nan valide kont lan
  if (profile.status !== "approved") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">🎤 Espas atis</h1>
        {profile.status === "pending" && (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-citron-400/40 bg-citron-400/10 p-5">
            <span className="text-3xl" aria-hidden>
              ⏳
            </span>
            <div>
              <p className="text-lg font-bold text-citron-300">Kont ou ap tann validasyon admin</p>
              <p className="text-sm text-zinc-300">Ou p ap ka pibliye mizik toutotan ekip UpMizik la pa apwouve kont ou.</p>
            </div>
          </div>
        )}
        <p className="mt-4 text-zinc-400">
          Bonjou {profile.display_name}! Espas atis ou ap louvri depi ekip UpMizik la valide kont ou. Pandan tan sa a, ou ka koute mizik sou{" "}
          <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300">
            paj akèy la
          </Link>
          .
        </p>
        <div className="mt-8">
          {profile.status === "blocked" ? <AccountStatusNotice status="blocked" /> : <RegistrationPanel userId={user.id} />}
        </div>
      </div>
    );
  }

  type RelRef = { kind: "ep" | "mixtape" | "album" };
  type DashboardSong = SongRow & {
    created_at: string;
    archived_at?: string | null;
    comments?: { count: number }[];
    release_id?: string | null;
    track_number?: number | null;
    release?: RelRef | RelRef[] | null;
  };
  const query = (columns: string) =>
    supabase.from("songs").select(columns).eq("artist_id", user.id).order("created_at", { ascending: false }).returns<DashboardSong[]>();

  // Ak piblikasyon an (album/EP/mixtape); si yon migration manke, eseye ak mwens kolòn
  let { data: rows, error } = await query(`${SONG_SELECT}, created_at, archived_at, comments(count), release_id, track_number, release:releases(kind)`);
  if (error) ({ data: rows, error } = await query(`${SONG_SELECT}, created_at, archived_at, comments(count)`));
  if (error) {
    // Si tablo comments la poko egziste, chaje chante yo san kòmantè
    ({ data: rows, error } = await query(`${SONG_SELECT}, created_at, archived_at`));
  }

  const songs = rows ?? [];
  const commentCount = (s: (typeof songs)[number]) => s.comments?.[0]?.count ?? 0;
  const totalPlays = songs.reduce((sum, s) => sum + s.play_count, 0);
  const totalComments = songs.reduce((sum, s) => sum + commentCount(s), 0);

  const [extras, balanceRes, { data: myPosts }] = await Promise.all([
    getSongExtras(supabase, songs.map((s) => s.id), user.id),
    supabase.rpc("artist_balance", { p_artist_id: user.id }),
    // 10 dènye pòs atis la (si migration Sosyal la poko kouri, lis la vid)
    supabase
      .from("posts")
      .select("id, content, created_at, expires_at, status, image_path, link_url")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<MyPost[]>(),
  ]);
  const balance = toBalance((balanceRes.data as BalanceRow[] | null)?.[0]);

  // Boost: plan yo, boost aktif yo, ak istwa demann yo (vid si migration boost la poko kouri)
  const [{ data: boostPlans }, { data: boostSongs }, { data: boostProfile }, { data: boostRows }] = await Promise.all([
    supabase.from("boost_plans").select("id, label, days, price_htg").eq("active", true).order("sort").returns<BoostPlan[]>(),
    supabase.from("songs").select("id, is_boosted, boost_expires_at").eq("artist_id", user.id),
    supabase.from("profiles").select("is_boosted, boost_expires_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("boost_purchases")
      .select("id, boost_type, target_id, amount, duration_days, status, expires_at, created_at, admin_note")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const boostUntil = new Map(
    ((boostSongs ?? []) as { id: string; is_boosted: boolean; boost_expires_at: string | null }[])
      .filter((b) => isBoostActive(b.is_boosted, b.boost_expires_at))
      .map((b) => [b.id, b.boost_expires_at as string]),
  );
  const songTitle = new Map(songs.map((s) => [s.id, s.title]));
  const boostHistory: BoostHistoryItem[] = (
    (boostRows ?? []) as {
      id: string;
      boost_type: BoostType;
      target_id: string;
      amount: number;
      duration_days: number;
      status: BoostStatus;
      expires_at: string | null;
      created_at: string;
      admin_note: string | null;
    }[]
  ).map((b) => ({
    id: b.id,
    type: b.boost_type,
    targetId: b.target_id,
    targetLabel: b.boost_type === "profil" ? "Pwofil mwen" : `« ${songTitle.get(b.target_id) ?? "Chante"} »`,
    amount: b.amount,
    days: b.duration_days,
    status: b.status,
    expiresAt: b.expires_at,
    createdAt: b.created_at,
    adminNote: b.admin_note,
  }));

  // Atis ki manm afilye tou: lyen pou Espas manm li
  const { data: memberRow } = await supabase.from("members").select("status, pseudo_referral").eq("user_id", user.id).maybeSingle();

  // Atis Pro: jiska 10 kolaboratè lè l ap modifye yon chante
  const isProArtist = (await supabase.rpc("is_pro", { p_user: user.id })).data === true;

  // Kòkpit la: ekout chak jou (30 jou) + kantite abone (atis Pro)
  const [{ data: dailyRows }, { data: followerCount }] = await Promise.all([
    supabase.rpc("play_stats_daily", { p_days: 30, p_artist_id: user.id }),
    isProArtist ? supabase.rpc("follower_count", { p_artist: user.id }) : Promise.resolve({ data: null }),
  ]);
  const daily30 = ((dailyRows ?? []) as { day: string; real_plays: number }[]).map((d) => ({ day: String(d.day).slice(0, 10), plays: Number(d.real_plays) }));

  // Mesaj jounen an: kat sitasyon jodi a (erè = migration an poko kouri → "ap vini byento")
  const { data: quoteRows } = await supabase.rpc("my_daily_card");
  const quoteRow = ((quoteRows ?? []) as { day: string; template: number; teks: string; kategori: string; etiket: string; sous: string | null }[])[0];
  const dailyCard = quoteRow
    ? {
        day: quoteRow.day,
        template: Math.min(6, Math.max(1, Number(quoteRow.template))) as QuoteTemplate,
        quote: { teks: quoteRow.teks, kategori: quoteRow.kategori, etiket: quoteRow.etiket, sous: quoteRow.sous },
      }
    : null;
  // Jan mizik prensipal atis la (pou ti liy "Atis Konpa · sou UpMizik" la)
  const genreCount = new Map<string, number>();
  for (const s of songs) if (s.genre) genreCount.set(s.genre, (genreCount.get(s.genre) ?? 0) + 1);
  const mainGenre = Array.from(genreCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const managed: ManagedSong[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    coverUrl: toTrack(supabase, s).coverUrl,
    plays: s.play_count,
    comments: commentCount(s),
    durationSeconds: s.duration_seconds,
    youtubeUrl: extras[s.id]?.songYoutubeUrl ?? null,
    createdAt: s.created_at,
    archived: Boolean(s.archived_at),
    releaseId: s.release_id ?? null,
    releaseKind: (Array.isArray(s.release) ? s.release[0] : s.release)?.kind ?? null,
    trackNumber: s.track_number ?? null,
  }));

  // Grafik 1: koute pa chante (top 8)
  const playsBySong: BarDatum[] = [...songs]
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 8)
    .map((s) => ({ label: s.title, value: s.play_count, detail: s.genre ?? undefined }));

  // Grafik 2: chante pa jan mizik
  const byGenre = new Map<string, { count: number; plays: number }>();
  for (const s of songs) {
    const g = s.genre ?? "San jan";
    const cur = byGenre.get(g) ?? { count: 0, plays: 0 };
    byGenre.set(g, { count: cur.count + 1, plays: cur.plays + s.play_count });
  }
  const songsByGenre: BarDatum[] = Array.from(byGenre.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([label, v]) => ({ label, value: v.count, detail: `${v.plays.toLocaleString("fr-HT")} ekout` }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardTabs />

      {/* ===== KÒKPIT: akèy, grafik 30 jou, chif yo, balans, objektif, bouton rapid ===== */}
      <ArtistCockpit
        artistId={user.id}
        name={profile.display_name}
        avatarUrl={profile.avatar_url ?? null}
        verified={profile.is_verified}
        pro={isProArtist}
        greeting={greeting()}
        totalPlays={totalPlays}
        songs={songs.length}
        comments={totalComments}
        followers={isProArtist ? Number(followerCount ?? 0) : null}
        availableHtg={balance.availableHtg}
        monthHtg={balance.currentMonthHtg}
        daily={daily30}
        memberCode={memberRow?.status === "approved" ? (memberRow.pseudo_referral ?? null) : null}
        shareText={donateShareText(profile.display_name, true)}
      />

      {/* ===== BOOST (piblisite peye) ===== */}
      {(boostPlans ?? []).length > 0 && (
        <BoostBox
          songs={songs
            .filter((s) => !s.archived_at)
            .map((s) => ({ id: s.id, title: s.title, coverUrl: toTrack(supabase, s).coverUrl, boostedUntil: boostUntil.get(s.id) ?? null }))}
          plans={boostPlans ?? []}
          profileBoostedUntil={isBoostActive(boostProfile?.is_boosted, boostProfile?.boost_expires_at) ? (boostProfile?.boost_expires_at as string) : null}
          history={boostHistory}
        />
      )}

      {/* ===== MESAJ JOUNEN AN: kat sitasyon pou pataje ===== */}
      <div id="mesaj" className="scroll-mt-24" />
      <DailyQuoteStudio
        card={dailyCard}
        artist={{ id: user.id, name: profile.display_name, avatarUrl: profile.avatar_url ?? null, genre: mainGenre }}
        pro={isProArtist}
      />

      {/* ===== STATI 24 È (atis Pro) ===== */}
      <StatusComposer
        pro={isProArtist}
        artist={{ id: user.id, name: profile.display_name, avatarUrl: profile.avatar_url ?? null, verified: profile.is_verified }}
      />

      {/* ===== SOSYAL: pibliye yon pòs ===== */}
      <PostComposer
        posts={(myPosts ?? []).map((p) => ({ ...p, imageUrl: postImageUrl(supabase, p.image_path) }))}
        artistId={user.id}
        artistName={profile.display_name}
      />

      {/* ===== NIVO YO ===== */}
      <div id="nivo" className="scroll-mt-24" />
      <LevelsCard artistId={user.id} verified={profile.is_verified} />

      {songs.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
          <p className="text-5xl">🎶</p>
          <h2 className="mt-4 text-xl font-bold text-white">Ou poko pibliye okenn chante</h2>
          <p className="mt-2 text-zinc-400">Upload premye chante w la, e estatistik ou yo ap parèt isit la.</p>
          <Link
            href="/upload"
            className="mt-6 inline-block rounded-full btn-primary px-6 py-3 font-semibold"
          >
            + Pibliye premye chante w
          </Link>
        </section>
      ) : (
        <>
          {/* ===== ESTATISTIK ===== */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Ekout pa chante" subtitle={songs.length > 8 ? "8 chante ki gen plis ekout yo" : "Tout chante ou yo"}>
              <BarChart data={playsBySong} unit="ekout" />
            </Panel>
            <Panel title="Chante pa jan mizik" subtitle="Konbyen chante ou genyen nan chak jan">
              <BarChart data={songsByGenre} unit="chante" />
            </Panel>
          </div>

          {/* ===== CHANTE YO ===== */}
          <div id="chante" className="mt-6 scroll-mt-24">
            <Panel title="Chante ou yo" subtitle={`${songs.length} chante sou platfòm lan`}>
              <SongManager songs={managed} artistId={user.id} pro={isProArtist} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
