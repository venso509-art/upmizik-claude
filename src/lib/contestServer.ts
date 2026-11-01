import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { CONTEST_SLUG, type Contest, type ContestMember, type ContestTeam } from "@/lib/contest";
import type { Track } from "@/components/player/PlayerProvider";

// votes = vòt faz kounye a; v1/v2/v3 = vòt chak faz; eligible = ka patisipe nan faz kounye a
export type TeamView = ContestTeam & {
  members: ContestMember[];
  votes: number;
  voters: number;
  v1: number;
  v2: number;
  v3: number;
  eligible: boolean;
  track: Track | null;
};

// Konkou a + ekip yo (ak elèv yo, vòt yo, chante faz 2 a), klase dapre vòt (faz 3: dapre plas final la)
export async function loadContest(): Promise<{ contest: Contest; teams: TeamView[] } | null> {
  const supabase = createClient();
  const { data: contest } = await supabase.from("contests").select("*").eq("slug", CONTEST_SLUG).maybeSingle<Contest>();
  if (!contest) return null;

  const [{ data: teamRows }, { data: memberRows }, { data: standRows }] = await Promise.all([
    supabase.from("contest_teams").select("*").eq("contest_id", contest.id).eq("active", true).order("sort").order("created_at").returns<ContestTeam[]>(),
    supabase.from("contest_members").select("*").order("sort").returns<ContestMember[]>(),
    supabase.rpc("contest_standings", { p_slug: contest.slug }),
  ]);
  type Stand = { team_id: string; votes: number; voters: number; v1: number; v2: number; v3: number; qualified: boolean; finalist: boolean };
  const stand = new Map(((standRows ?? []) as Stand[]).map((r) => [r.team_id, r]));

  const songIds = (teamRows ?? []).map((t) => t.song_id).filter((x): x is string => !!x);
  const { data: songRows } = songIds.length ? await supabase.from("songs").select(SONG_SELECT).in("id", songIds).returns<SongRow[]>() : { data: [] as SongRow[] };
  const tracks = new Map((songRows ?? []).map((s) => [s.id, toTrack(supabase, s)]));

  let teams: TeamView[] = (teamRows ?? []).map((t) => ({
    ...t,
    members: (memberRows ?? []).filter((m) => m.team_id === t.id),
    votes: Number(stand.get(t.id)?.votes ?? 0),
    voters: Number(stand.get(t.id)?.voters ?? 0),
    v1: Number(stand.get(t.id)?.v1 ?? 0),
    v2: Number(stand.get(t.id)?.v2 ?? 0),
    v3: Number(stand.get(t.id)?.v3 ?? 0),
    qualified: stand.get(t.id)?.qualified ?? t.qualified,
    eligible:
      contest.phase === 1 ? true : contest.phase === 2 ? (stand.get(t.id)?.qualified ?? t.qualified) : (stand.get(t.id)?.finalist ?? t.finalist),
    track: t.song_id ? tracks.get(t.song_id) ?? null : null,
  }));
  // Faz 2: sèlman ekip ki kalifye yo; faz 3: sèlman 5 finalis yo (gayan yo an premye lè yo pibliye)
  if (contest.phase > 1) teams = teams.filter((t) => t.eligible);
  teams.sort((a, b) => (a.final_rank ?? 99) - (b.final_rank ?? 99) || b.votes - a.votes || a.sort - b.sort);
  return { contest, teams };
}
