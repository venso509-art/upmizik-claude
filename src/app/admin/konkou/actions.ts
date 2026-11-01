"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Admin: jere Konkou Nwèl la (RLS: se admin sèlman ki ka ekri nan tab konkou yo)
type Result = { error?: string; id?: string };

const done = () => {
  revalidatePath("/admin/konkou");
  revalidatePath("/konkou", "layout");
};
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function saveContest(id: string, input: { title: string; subtitle: string; description: string; phase: number; price: number; open: boolean; endsAt: string }): Promise<Result> {
  if (![1, 2, 3].includes(input.phase)) return { error: "Faz la pa valid." };
  if (!(input.price >= 1)) return { error: "Pri yon vòt la pa valid." };
  const { error } = await createClient()
    .from("contests")
    .update({
      title: clip(input.title, 120),
      subtitle: clip(input.subtitle, 200) || null,
      description: clip(input.description, 2000) || null,
      phase: input.phase,
      vote_price_htg: Math.round(input.price),
      voting_open: input.phase < 3 && input.open,
      phase_ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  done();
  return {};
}

export type TeamInput = {
  school_name: string;
  team_name: string;
  slogan: string;
  description: string;
  photo_url: string | null;
  song_id: string;
  qualified: boolean;
  final_rank: number | null;
  sort: number;
  active: boolean;
};

const teamRow = (t: TeamInput) => ({
  school_name: clip(t.school_name, 120),
  team_name: clip(t.team_name, 80),
  slogan: clip(t.slogan, 140) || null,
  description: clip(t.description, 1500) || null,
  photo_url: t.photo_url,
  song_id: /^[0-9a-f-]{36}$/i.test(t.song_id.trim()) ? t.song_id.trim() : null,
  qualified: t.qualified,
  final_rank: t.final_rank && t.final_rank >= 1 && t.final_rank <= 10 ? t.final_rank : null,
  sort: Math.round(t.sort) || 0,
  active: t.active,
});

export async function saveTeam(contestId: string, teamId: string | null, input: TeamInput): Promise<Result> {
  if (input.school_name.trim().length < 2 || input.team_name.trim().length < 2) return { error: "Mete non lekòl la ak non gwoup la." };
  const supabase = createClient();
  const res = teamId
    ? await supabase.from("contest_teams").update(teamRow(input)).eq("id", teamId).select("id").single()
    : await supabase.from("contest_teams").insert({ ...teamRow(input), contest_id: contestId }).select("id").single();
  if (res.error) return { error: res.error.message };
  done();
  return { id: res.data.id as string };
}

export async function deleteTeam(teamId: string): Promise<Result> {
  const { error } = await createClient().from("contest_teams").delete().eq("id", teamId);
  if (error) return { error: error.message };
  done();
  return {};
}

export type MemberInput = { id?: string; display_name: string; role: string; bio: string; photo_url: string | null; sort: number };

// Ranplase lis elèv yon ekip (maks 6)
export async function saveMembers(teamId: string, members: MemberInput[]): Promise<Result> {
  const clean = members
    .filter((m) => m.display_name.trim().length >= 2)
    .slice(0, 6)
    .map((m, i) => ({ team_id: teamId, display_name: clip(m.display_name, 60), role: clip(m.role, 40) || null, bio: clip(m.bio, 300) || null, photo_url: m.photo_url, sort: i }));
  const supabase = createClient();
  const { error: delErr } = await supabase.from("contest_members").delete().eq("team_id", teamId);
  if (delErr) return { error: delErr.message };
  if (clean.length) {
    const { error } = await supabase.from("contest_members").insert(clean);
    if (error) return { error: error.message };
  }
  done();
  return {};
}

export async function reviewVote(voteId: string, approve: boolean, note: string): Promise<Result> {
  const { error } = await createClient().rpc("review_contest_vote", { p_vote: voteId, p_approve: approve, p_note: note || null });
  if (error) return { error: error.message };
  done();
  return {};
}
