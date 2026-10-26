"use client";

import { useState, useTransition } from "react";
import { payMember, reviewMember } from "@/app/manm/actions";
import { formatUsd, monthEarnings, monthName, type MemberStatus } from "@/lib/members";

export type AdminMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  motivation: string | null;
  pseudo: string | null;
  objective: number;
  totalProgress: number;
  totalEarned: number;
  status: MemberStatus;
  adminNote: string | null;
  createdAt: string;
  sex: "fi" | "gason" | null;
  nickname: string | null; // non jwèt / non atis
  isArtist: boolean; // atis ki vin manm tou
  accountSince: string | null; // dat kont UpMizik la te kreye
  referredTotal: number; // tout atis ki enskri ak pseudo a
  referredPending: number;
  referredBad: number; // bloke oswa achive (siy fwod)
  months: { key: string; count: number; paid: number | null }[]; // mwa ki gen atis (pi resan an premye)
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" });

export function MemberAdminList({ members, htgPerUsd, thisMonth }: { members: AdminMember[]; htgPerUsd: number; thisMonth: string }) {
  if (members.length === 0) return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen anyen isit la pou kounye a.</p>;
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {members.map((m) => (
        <MemberCard key={m.id} m={m} htgPerUsd={htgPerUsd} thisMonth={thisMonth} />
      ))}
    </ul>
  );
}

function MemberCard({ m, htgPerUsd, thisMonth }: { m: AdminMember; htgPerUsd: number; thisMonth: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const current = m.months.find((x) => x.key === thisMonth)?.count ?? 0;
  const pct = Math.min(100, Math.round((current / m.objective) * 100));
  const unpaid = m.months.filter((x) => x.paid === null && x.count > 0);
  const [period, setPeriod] = useState(unpaid[0]?.key ?? "");
  const [method, setMethod] = useState<"moncash" | "natcash">("moncash");
  const [reference, setReference] = useState("");
  const toPay = m.months.find((x) => x.key === period);
  const amount = toPay ? monthEarnings(toPay.count, m.objective).usd : 0;

  function review(action: "approve" | "reject" | "block") {
    if (action === "reject" && !note.trim()) return setMsg({ ok: false, text: "Ekri rezon an anvan w rejte (moun nan ap wè l pou l korije)." });
    const q = {
      approve: `Apwouve ${m.fullName}? Sistèm nan ap kreye pseudo li.`,
      reject: `Rejte demann ${m.fullName}? Li ka korije l epi voye l ankò.`,
      block: `Bloke ${m.fullName}?`,
    };
    if (!confirm(q[action])) return;
    setMsg(undefined);
    startTransition(async () => {
      const res = await reviewMember(m.id, action, note);
      setMsg(
        res.error
          ? { ok: false, text: res.error }
          : { ok: true, text: action === "approve" ? `✓ Apwouve · pseudo: ${res.code}` : action === "reject" ? "✓ Rejte" : "✓ Bloke" },
      );
    });
  }
  const ageDays = m.accountSince ? Math.floor((Date.now() - new Date(m.accountSince).getTime()) / 86400000) : null;

  function pay() {
    if (!toPay) return;
    if (!confirm(`Anrejistre peman ${formatUsd(amount)} (${Math.round(amount * htgPerUsd).toLocaleString("fr-HT")} HTG) pou ${monthName(period, true)}?`)) return;
    setMsg(undefined);
    startTransition(async () => {
      const res = await payMember(m.id, period, method, reference);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "✓ Peman an anrejistre" });
    });
  }

  return (
    <li className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D3854] font-black text-white">
          {m.fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">
            {m.nickname ?? m.fullName}
            {m.isArtist && <span className="ml-1.5 rounded bg-fuchsia-600/30 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-200">🎤 Atis</span>}
          </p>
          {m.nickname && <p className="truncate text-xs text-zinc-300">Vrè non: {m.fullName}</p>}
          <p className="truncate text-xs text-zinc-400">
            {m.email} · <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}`} className="text-emerald-300 hover:underline">{m.phone}</a>
            {m.city ? ` · ${m.city}` : ""}
          </p>
          <p className="text-xs text-zinc-500">
            Demann {date(m.createdAt)}
            {m.sex ? ` · ${m.sex === "fi" ? "👩 Fi" : "👨 Gason"}` : ""}
            {ageDays !== null ? ` · Kont depi ${ageDays === 0 ? "jodi a" : `${ageDays} jou`}` : ""}
          </p>
        </div>
        {m.pseudo && <span className="shrink-0 rounded-lg bg-[#0B132B] px-2.5 py-1 text-xs font-black tracking-wider text-[#FFD700]">{m.pseudo}</span>}
      </div>
      {m.motivation && <p className="rounded-xl bg-zinc-950/60 p-3 text-xs text-zinc-300">“{m.motivation}”</p>}
      {/* Enfòmasyon pou deside: atis li fè enskri yo, ak siy fwod */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-300">🎤 {m.referredTotal} atis enskri ak pseudo a</span>
        {m.referredPending > 0 && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">⏳ {m.referredPending} ap tann apwobasyon</span>}
        {m.referredBad > 0 && <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-bold text-red-300">⚠️ {m.referredBad} bloke/achive: tcheke fwod</span>}
        {ageDays !== null && ageDays < 3 && m.status === "pending" && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">⚠️ Kont fèk kreye</span>}
      </div>

      {m.status === "approved" && (
        <>
          {/* Pwogrè mwa a */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span className="capitalize">
                {monthName(thisMonth)}: <strong className="text-white">{current}</strong> / {m.objective} atis
              </span>
              <span>
                Total: {m.totalProgress} atis · touche {formatUsd(m.totalEarned)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-[#FFD700]" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Mwa yo */}
          {m.months.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {m.months.map((x) => (
                <li key={x.key} className={`rounded-full px-2.5 py-1 text-[11px] ${x.paid !== null ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-zinc-300"}`}>
                  <span className="capitalize">{monthName(x.key)}</span>: {x.count} atis · {formatUsd(monthEarnings(x.count, m.objective).usd)} {x.paid !== null ? "✓ peye" : ""}
                </li>
              ))}
            </ul>
          )}

          {/* Peye */}
          {unpaid.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFD700]">💸 Peye manm nan</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-white">
                  {unpaid.map((x) => (
                    <option key={x.key} value={x.key}>
                      {monthName(x.key, true)} ({x.count} atis)
                    </option>
                  ))}
                </select>
                <select value={method} onChange={(e) => setMethod(e.target.value as "moncash" | "natcash")} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-white">
                  <option value="moncash">MonCash</option>
                  <option value="natcash">NatCash</option>
                </select>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={80}
                  placeholder="Nimewo tranzaksyon"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                />
              </div>
              <button
                type="button"
                disabled={pending || !toPay}
                onClick={pay}
                className="w-full rounded-lg bg-[#FFD700] px-3 py-2 font-black text-[#0B132B] disabled:opacity-50"
              >
                {pending ? "…" : `💸 Peye ${formatUsd(amount)} · ${Math.round(amount * htgPerUsd).toLocaleString("fr-HT")} HTG`}
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Pa gen mwa pou peye pou kounye a.</p>
          )}
        </>
      )}

      {m.adminNote && <p className="rounded-lg bg-zinc-950 px-2 py-1 text-xs text-zinc-400">Nòt: {m.adminNote}</p>}

      {/* Apwouve / bloke */}
      <div className="space-y-2">
        {m.status !== "blocked" && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={m.status === "pending" ? "Rezon (obligatwa pou Rejte; moun nan ap wè l)" : "Rezon si w bloke l"}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-[#FFD700]"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {m.status !== "approved" && (
            <button type="button" disabled={pending} onClick={() => review("approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
              {m.status === "blocked" ? "✅ Debloke" : m.status === "rejected" ? "✅ Apwouve kanmenm" : "✅ Apwouve"}
            </button>
          )}
          {m.status === "pending" && (
            <button type="button" disabled={pending} onClick={() => review("reject")} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-500 disabled:opacity-60">
              ↩️ Rejte
            </button>
          )}
          {m.status !== "blocked" && (
            <button type="button" disabled={pending} onClick={() => review("block")} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-500 disabled:opacity-60">
              ⛔ Bloke
            </button>
          )}
        </div>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
    </li>
  );
}
