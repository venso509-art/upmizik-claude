// ===== 🎄 Konkou Chante Nwèl: tip ak ti zouti (migration 20270101000006_contest.sql) =====

export const CONTEST_SLUG = "nwel-2026";

export type Contest = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  phase: 1 | 2 | 3;
  vote_price_htg: number;
  voting_open: boolean;
  phase_ends_at: string | null;
  phase1_goal: number; // vòt pou kalifye (faz 1)
  phase2_goal: number; // objektif faz 2
  finalists: number; // kantite ekip ki ale nan final la
  phase3_goal: number; // objektif final la: yon chanpyon solid rive la (1 000 vòt)
};

export type ContestMember = { id: string; team_id: string; display_name: string; role: string | null; bio: string | null; photo_url: string | null; sort: number };

export type ContestTeam = {
  id: string;
  contest_id: string;
  school_name: string;
  team_name: string;
  slogan: string | null;
  description: string | null;
  photo_url: string | null;
  song_id: string | null;
  qualified: boolean;
  finalist: boolean;
  final_rank: number | null;
  sort: number;
  active: boolean;
  members?: ContestMember[];
};

export const PHASES = [
  { n: 1, label: "Kalifikasyon", icon: "🗳️", text: "Vote pou ekip lekòl ou pi renmen an" },
  { n: 2, label: "Demi-final", icon: "🎙️", text: "Koute chante Nwèl yo epi vote ankò" },
  { n: 3, label: "Final", icon: "🏆", text: "5 finalis yo: 1ye, 2yèm, 3yèm pri" },
] as const;

export const MEDALS: Record<number, { icon: string; label: string; color: string }> = {
  1: { icon: "🥇", label: "1ye plas", color: "#FFD700" },
  2: { icon: "🥈", label: "2yèm plas", color: "#C0C7D1" },
  3: { icon: "🥉", label: "3yèm plas", color: "#D9925B" },
};

// Kantite vòt yon montan bay (50 goud = 1 vòt)
export const votesFor = (amount: number, price: number) => (amount >= price ? Math.floor(amount / price) : 0);
