"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { deleteTeam, publishWinners, reviewVote, saveContest, saveMembers, saveTeam, setPhase, type MemberInput, type TeamInput } from "@/app/admin/konkou/actions";
import { PHASES, type Contest, type ContestTeam } from "@/lib/contest";
import { formatHTG } from "@/lib/donations";

const input =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-citron-400 focus:outline-none";
const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-400";

// Monte yon foto nan bucket "contest" la (piblik), epi retounen lyen an
async function uploadPhoto(file: File, folder: string) {
  const small = await compressImage(file, 1400, 0.86);
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("contest").upload(path, small, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("contest").getPublicUrl(path).data.publicUrl;
}

function PhotoPick({ url, onChange, round }: { url: string | null; onChange: (u: string | null) => void; round?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-zinc-800 text-2xl ring-1 ring-white/10 hover:ring-citron-400 ${round ? "h-14 w-14 rounded-full" : "h-20 w-28 rounded-xl"}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : busy ? (
          "⏳"
        ) : (
          "📷"
        )}
      </button>
      <div className="text-xs text-zinc-400">
        <button type="button" onClick={() => ref.current?.click()} className="font-semibold text-citron-300 hover:text-citron-200">
          {url ? "Chanje foto a" : "Ajoute yon foto"}
        </button>
        {url && (
          <button type="button" onClick={() => onChange(null)} className="ml-3 text-zinc-500 hover:text-red-300">
            Retire
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onChange(await uploadPhoto(f, round ? "members" : "teams"));
          } catch (err) {
            alert(err instanceof Error ? err.message : "Foto a pa monte.");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

// ===== Paramèt konkou a: faz, objektif, vòt louvri/fèmen, dat fen, pri yon vòt =====
export function ContestSettings({ contest }: { contest: Contest }) {
  const [f, setF] = useState({
    title: contest.title,
    subtitle: contest.subtitle ?? "",
    description: contest.description ?? "",
    price: contest.vote_price_htg,
    open: contest.voting_open,
    endsAt: contest.phase_ends_at ? new Date(contest.phase_ends_at).toISOString().slice(0, 16) : "",
    goal1: contest.phase1_goal,
    goal2: contest.phase2_goal,
    goal3: contest.phase3_goal,
    finalists: contest.finalists,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();

  const changePhase = (n: number) => {
    if (n === contest.phase) return;
    const warn =
      n === 2
        ? `Pase nan FAZ 2?\n\nEkip ki gen ${contest.phase1_goal} vòt oswa plis yo ap kalifye otomatikman. Vòt yo rekòmanse a zewo pou faz 2.`
        : n === 3
          ? `Pase nan FINAL la (faz 3)?\n\n${contest.finalists} premye ekip yo nan vòt faz 2 a ap vin finalis. Vòt yo rekòmanse a zewo pou final la.`
          : "Retounen nan faz 1?";
    if (!confirm(warn)) return;
    start(async () => {
      const res = await setPhase(contest.id, n);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: `✓ Konkou a nan faz ${n} kounye a.` });
    });
  };

  return (
    <section className="rounded-3xl border border-citron-400/30 bg-gradient-to-br from-red-900/20 via-zinc-900/60 to-[#0A5C36]/20 p-5 sm:p-6">
      <h2 className="text-lg font-black text-white">⚙️ Paramèt konkou a</h2>
      {/* Faz yo: peze youn pou pase ladan l */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {PHASES.map((p) => (
          <button
            key={p.n}
            type="button"
            disabled={pending}
            onClick={() => changePhase(p.n)}
            className={`rounded-2xl px-3 py-3 text-left transition ${contest.phase === p.n ? "bg-citron-400 text-zinc-950" : "bg-white/[0.04] text-white ring-1 ring-white/10 hover:bg-white/[0.08]"}`}
          >
            <span className="block text-lg">{p.icon}</span>
            <span className="block text-sm font-black">
              Faz {p.n}: {p.label}
            </span>
            <span className={`block text-[11px] ${contest.phase === p.n ? "text-zinc-950/70" : "text-zinc-500"}`}>{contest.phase === p.n ? "● Kounye a" : "Peze pou pase ladan l"}</span>
          </button>
        ))}
      </div>
      {contest.phase === 3 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Pibliye gayan yo?\n\n3 premye ekip yo nan vòt final la ap resevwa 🥇🥈🥉, epi vòt yo ap fèmen.")) return;
            start(async () => {
              const res = await publishWinners(contest.id);
              setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "🏆 Gayan yo pibliye!" });
            });
          }}
          className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#FFE34D] to-[#E6C000] px-4 py-3 font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20"
        >
          🏆 Pibliye gayan yo (🥇🥈🥉)
        </button>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className={label}>Vòt pou kalifye (faz 1)</span>
          <input type="number" min={1} value={f.goal1} onChange={(e) => setF({ ...f, goal1: Number(e.target.value) })} className={input} />
        </label>
        <label className="block">
          <span className={label}>Objektif faz 2</span>
          <input type="number" min={1} value={f.goal2} onChange={(e) => setF({ ...f, goal2: Number(e.target.value) })} className={input} />
        </label>
        <label className="block">
          <span className={label}>Objektif final (faz 3)</span>
          <input type="number" min={1} value={f.goal3} onChange={(e) => setF({ ...f, goal3: Number(e.target.value) })} className={input} />
        </label>
        <label className="block">
          <span className={label}>Ekip nan final la</span>
          <input type="number" min={1} value={f.finalists} onChange={(e) => setF({ ...f, finalists: Number(e.target.value) })} className={input} />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={label}>Tit</span>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Ti fraz anba tit la</span>
          <input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Deskripsyon</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className={`${input} resize-y`} />
        </label>
        <label className="block">
          <span className={label}>Pri yon vòt (goud)</span>
          <input type="number" min={1} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={input} />
        </label>
        <label className="block">
          <span className={label}>Fen faz la (kont a rebou)</span>
          <input type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} className={input} />
        </label>
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
        <input type="checkbox" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} className="h-5 w-5 accent-[#FFD700]" />
        <span>
          <span className="block font-bold text-white">🗳️ Vòt yo louvri</span>
          <span className="block text-xs text-zinc-400">Lè sa etenn, moun yo wè ekip yo men yo pa ka vote.</span>
        </span>
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveContest(contest.id, f);
              setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "✓ Konkou a ajou." });
            })
          }
          className="rounded-xl bg-citron-400 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-citron-300 disabled:opacity-50"
        >
          💾 Sove
        </button>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}

// ===== Yon ekip: lekòl, gwoup, eslogan, foto, elèv yo, kalifikasyon, plas final =====
export function TeamEditor({ contestId, team, onClose }: { contestId: string; team?: ContestTeam; onClose?: () => void }) {
  const [t, setT] = useState<TeamInput>({
    school_name: team?.school_name ?? "",
    team_name: team?.team_name ?? "",
    slogan: team?.slogan ?? "",
    description: team?.description ?? "",
    photo_url: team?.photo_url ?? null,
    song_id: team?.song_id ?? "",
    qualified: team?.qualified ?? false,
    final_rank: team?.final_rank ?? null,
    sort: team?.sort ?? 0,
    active: team?.active ?? true,
  });
  const [members, setMembers] = useState<MemberInput[]>(
    team?.members?.length ? team.members.map((m) => ({ display_name: m.display_name, role: m.role ?? "", bio: m.bio ?? "", photo_url: m.photo_url, sort: m.sort })) : [
      { display_name: "", role: "", bio: "", photo_url: null, sort: 0 },
      { display_name: "", role: "", bio: "", photo_url: null, sort: 1 },
      { display_name: "", role: "", bio: "", photo_url: null, sort: 2 },
    ],
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();
  const setM = (i: number, patch: Partial<MemberInput>) => setMembers((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-700 bg-zinc-900/80 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Non lekòl la</span>
          <input value={t.school_name} onChange={(e) => setT({ ...t, school_name: e.target.value })} placeholder="Egz: Lise Nasyonal Tomond" className={input} />
        </label>
        <label className="block">
          <span className={label}>Non gwoup la</span>
          <input value={t.team_name} onChange={(e) => setT({ ...t, team_name: e.target.value })} placeholder="Egz: Zetwal Nwèl" className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Eslogan</span>
          <input value={t.slogan} onChange={(e) => setT({ ...t, slogan: e.target.value })} maxLength={140} placeholder="Egz: Nou chante pou lespwa!" className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Deskripsyon</span>
          <textarea value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} rows={3} maxLength={1500} className={`${input} resize-y`} />
        </label>
      </div>
      <div>
        <span className={label}>Foto ekip la</span>
        <PhotoPick url={t.photo_url} onChange={(u) => setT({ ...t, photo_url: u })} />
      </div>

      {/* Elèv yo */}
      <div>
        <span className={label}>Elèv yo (non + premye lèt siyati sèlman, egz: « Wideline P. »)</span>
        <ul className="space-y-2">
          {members.map((m, i) => (
            <li key={i} className="grid gap-2 rounded-2xl bg-zinc-950/50 p-3 sm:grid-cols-[auto_1fr_1fr]">
              <PhotoPick round url={m.photo_url} onChange={(u) => setM(i, { photo_url: u })} />
              <input value={m.display_name} onChange={(e) => setM(i, { display_name: e.target.value })} placeholder="Non" className={input} />
              <input value={m.role} onChange={(e) => setM(i, { role: e.target.value })} placeholder="Wòl: Chantè, Rap, Koris…" className={input} />
              <input value={m.bio} onChange={(e) => setM(i, { bio: e.target.value })} maxLength={300} placeholder="Yon ti fraz sou li/li" className={`${input} sm:col-span-3`} />
            </li>
          ))}
        </ul>
        {members.length < 6 && (
          <button type="button" onClick={() => setMembers([...members, { display_name: "", role: "", bio: "", photo_url: null, sort: members.length }])} className="mt-2 text-sm font-semibold text-citron-300">
            + Ajoute yon elèv
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className={label}>ID chante a (faz 2)</span>
          <input value={t.song_id} onChange={(e) => setT({ ...t, song_id: e.target.value })} placeholder="Kole ID chante a (nan lyen /chante/…)" className={input} />
        </label>
        <label className="block">
          <span className={label}>Plas final (faz 3)</span>
          <select value={t.final_rank ?? ""} onChange={(e) => setT({ ...t, final_rank: e.target.value ? Number(e.target.value) : null })} className={input}>
            <option value="">—</option>
            <option value="1">🥇 1ye</option>
            <option value="2">🥈 2yèm</option>
            <option value="3">🥉 3yèm</option>
          </select>
        </label>
        <label className="block">
          <span className={label}>Lòd (0 = an premye)</span>
          <input type="number" value={t.sort} onChange={(e) => setT({ ...t, sort: Number(e.target.value) })} className={input} />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-white">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={t.qualified} onChange={(e) => setT({ ...t, qualified: e.target.checked })} className="h-4 w-4 accent-[#FFD700]" /> ✅ Kalifye pou final la
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} className="h-4 w-4 accent-[#FFD700]" /> Vizib sou sit la
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveTeam(contestId, team?.id ?? null, t);
              if (res.error || !res.id) return setMsg({ ok: false, text: res.error ?? "Erè" });
              const r2 = await saveMembers(res.id, members);
              if (r2.error) return setMsg({ ok: false, text: r2.error });
              setMsg({ ok: true, text: "✓ Ekip la sove." });
              if (!team) onClose?.();
            })
          }
          className="rounded-xl bg-citron-400 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-citron-300 disabled:opacity-50"
        >
          💾 Sove ekip la
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Fèmen
          </button>
        )}
        {team && (
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Efase ekip « ${team.team_name} » ak tout vòt li yo?`)) return;
              start(async () => {
                const res = await deleteTeam(team.id);
                setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Ekip la efase." });
              });
            }}
            className="ml-auto text-sm text-red-300 hover:text-red-200"
          >
            🗑️ Efase ekip la
          </button>
        )}
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}

export function TeamList({ contestId, teams, standings }: { contestId: string; teams: ContestTeam[]; standings: Record<string, { votes: number; money: number }> }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">🏫 Ekip yo ({teams.length})</h2>
        <button type="button" onClick={() => setEditing("new")} className="rounded-xl bg-citron-400 px-4 py-2 text-sm font-black text-zinc-950 hover:bg-citron-300">
          + Ajoute yon ekip
        </button>
      </div>
      {editing === "new" && <TeamEditor contestId={contestId} onClose={() => setEditing(null)} />}
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={t.id}>
            {editing === t.id ? (
              <TeamEditor contestId={contestId} team={t} onClose={() => setEditing(null)} />
            ) : (
              <button type="button" onClick={() => setEditing(t.id)} className="flex w-full items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 text-left hover:border-zinc-600">
                <span className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                  {t.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">
                    {t.team_name} {t.final_rank ? ["", "🥇", "🥈", "🥉"][t.final_rank] ?? "" : ""}
                  </span>
                  <span className="block truncate text-xs text-zinc-400">
                    {t.school_name} · {t.members?.length ?? 0} elèv {t.qualified && "· ✅ Kalifye"} {t.finalist && "· 🏆 Finalis"} {!t.active && "· 🙈 Kache"}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block font-black text-citron-300">{(standings[t.id]?.votes ?? 0).toLocaleString("fr-HT")} vòt</span>
                  <span className="block text-xs text-zinc-500">{formatHTG(standings[t.id]?.money ?? 0)}</span>
                </span>
                <span className="text-zinc-500">✏️</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export type PendingVote = {
  id: string;
  team_name: string;
  school_name: string;
  phase: number;
  amount_htg: number;
  votes: number;
  voter_name: string | null;
  method: string;
  transaction_ref: string | null;
  created_at: string;
  proof_url: string | null;
};

// ===== Vòt k ap tann: gade prèv la, valide oswa rejte =====
export function VoteReview({ votes }: { votes: PendingVote[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const visible = votes.filter((v) => !hidden.has(v.id));

  const act = (v: PendingVote, approve: boolean) => {
    const note = approve ? "" : prompt("Rezon ou rejte vòt sa a (egz: prèv la pa bon):") ?? "";
    if (!approve && !note.trim()) return;
    start(async () => {
      const res = await reviewVote(v.id, approve, note);
      if (res.error) return setErr(res.error);
      setHidden((p) => new Set(p).add(v.id));
    });
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-lg font-black text-white">🗳️ Vòt k ap tann ({visible.length})</h2>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Pa gen vòt k ap tann.</p>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {visible.map((v) => (
            <li key={v.id} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              {v.proof_url ? (
                <a href={v.proof_url} target="_blank" rel="noopener noreferrer" className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.proof_url} alt="Prèv peman" className="h-full w-full object-cover" />
                </a>
              ) : (
                <span className="h-28 w-20 shrink-0 rounded-xl bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-black text-white">
                  {v.votes} vòt · {formatHTG(Number(v.amount_htg))}
                </p>
                <p className="truncate text-zinc-300">
                  → {v.team_name} <span className="text-zinc-500">({v.school_name}) · faz {v.phase}</span>
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {v.voter_name ?? "Anonim"} · {v.method === "natcash" ? "NatCash" : "MonCash"}
                  {v.transaction_ref && ` · #${v.transaction_ref}`} · {new Date(v.created_at).toLocaleString("fr-HT")}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={pending} onClick={() => act(v, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
                    ✅ Valide
                  </button>
                  <button type="button" disabled={pending} onClick={() => act(v, false)} className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600 hover:text-white">
                    ❌ Rejte
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
