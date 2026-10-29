"use client";

import { useState, useTransition } from "react";
import { addQuote, deleteQuote, saveDayTopics, setQuoteActive, updateQuote } from "@/app/admin/sitasyon/actions";
import { QUOTE_CATEGORIES, WEEKDAYS, categoryLabel } from "@/lib/dailyQuotes";

export type AdminQuote = { id: number; teks: string; kategori: string; sous: string | null; active: boolean };

const input =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-citron-400 focus:outline-none";

function CategorySelect({ value, onChange, allowMix }: { value: string; onChange: (v: string) => void; allowMix?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      {allowMix ? <option value="">🎲 Melanje (tout kategori)</option> : <option value="">Chwazi kategori a…</option>}
      {QUOTE_CATEGORIES.map((c) => (
        <option key={c.key} value={c.key}>
          {c.icon} {c.label}
        </option>
      ))}
    </select>
  );
}

// Fòm pou ajoute oswa modifye yon sitasyon
function QuoteForm({ initial, onDone, submitLabel }: { initial?: AdminQuote; onDone?: () => void; submitLabel: string }) {
  const [teks, setTeks] = useState(initial?.teks ?? "");
  const [kategori, setKategori] = useState(initial?.kategori ?? "");
  const [sous, setSous] = useState(initial?.sous ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const res = initial ? await updateQuote(initial.id, { teks, kategori, sous }) : await addQuote({ teks, kategori, sous });
          if (res.error) return setError(res.error);
          if (!initial) {
            setTeks("");
            setSous("");
          }
          onDone?.();
        });
      }}
      className="space-y-3"
    >
      <textarea value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={140} rows={2} placeholder="Ekri sitasyon an an Kreyòl…" className={`${input} resize-y`} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <CategorySelect value={kategori} onChange={setKategori} />
        <input value={sous} onChange={(e) => setSous(e.target.value)} maxLength={80} placeholder="Sous (opsyonèl), egz: Pwovèb ayisyen" className={input} />
        <button type="submit" disabled={pending} className="rounded-xl bg-citron-400 px-5 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-citron-300 disabled:opacity-50">
          {pending ? "…" : submitLabel}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {teks.length}/140 karaktè. Pi bon longè a: mwens pase 90 karaktè. Pa janm mete non yon moun selèb kòm sous.
      </p>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}

function QuoteRow({ q }: { q: AdminQuote }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  if (editing) {
    return (
      <li className="rounded-2xl border border-citron-400/40 bg-zinc-900/80 p-4">
        <QuoteForm initial={q} submitLabel="💾 Sove" onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-xs text-zinc-400 hover:text-white">
          Anile
        </button>
      </li>
    );
  }

  return (
    <li className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 transition ${q.active ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-950/40 opacity-60"}`}>
      <span className="mt-0.5 w-12 shrink-0 font-mono text-xs text-zinc-500">#{q.id}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">{q.teks}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {categoryLabel(q.kategori)}
          {q.sous && ` · — ${q.sous}`}
          {!q.active && " · ⏸ dezaktive"}
        </p>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white">
          ✏️
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setError((await setQuoteActive(q.id, !q.active)).error))}
          className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
          title={q.active ? "Dezaktive (li p ap parèt ankò)" : "Reaktive"}
        >
          {q.active ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Efase sitasyon #${q.id}?\n\n"${q.teks}"`)) return;
            start(async () => setError((await deleteQuote(q.id)).error));
          }}
          className="rounded-lg border border-red-900/70 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-600 hover:text-white"
        >
          🗑️
        </button>
      </div>
    </li>
  );
}

export function NewQuoteBox() {
  const [done, setDone] = useState(false);
  return (
    <section className="rounded-3xl border border-citron-400/30 bg-zinc-900/50 p-5">
      <h2 className="font-bold text-white">➕ Ajoute yon sitasyon</h2>
      <div className="mt-3">
        <QuoteForm
          submitLabel="Ajoute"
          onDone={() => {
            setDone(true);
            setTimeout(() => setDone(false), 2500);
          }}
        />
      </div>
      {done && <p className="mt-2 text-sm font-semibold text-emerald-300">✓ Sitasyon an ajoute.</p>}
    </section>
  );
}

export function QuoteList({ quotes }: { quotes: AdminQuote[] }) {
  if (!quotes.length) return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen sitasyon pou rechèch sa a.</p>;
  return (
    <ul className="space-y-2">
      {quotes.map((q) => (
        <QuoteRow key={q.id} q={q} />
      ))}
    </ul>
  );
}

// Sijè chak jou nan semèn nan
export function DayTopicsEditor({ initial }: { initial: (string | null)[] }) {
  const [topics, setTopics] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();
  // Lendi an premye (jan moun abitye wè semèn nan)
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="font-bold text-white">📅 Sijè chak jou</h2>
      <p className="mt-1 text-sm text-zinc-400">Chak jou, tout atis yo resevwa yon sitasyon nan sijè jou a (chak atis jwenn yon sitasyon diferan). « Melanje » = nenpòt kategori, men pa menm ak yè.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {order.map((d) => (
          <label key={d} className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-400">{WEEKDAYS[d]}</span>
            <CategorySelect
              allowMix
              value={topics[d] ?? ""}
              onChange={(v) => setTopics((prev) => prev.map((t, i) => (i === d ? v || null : t)))}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveDayTopics(topics);
              setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "✓ Sijè yo sove. Yo aplike depi demen (kat jodi a pa chanje)." });
            })
          }
          className="rounded-xl bg-citron-400 px-5 py-2.5 text-sm font-black text-zinc-950 hover:bg-citron-300 disabled:opacity-50"
        >
          💾 Sove sijè yo
        </button>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
