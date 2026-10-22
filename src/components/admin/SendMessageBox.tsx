"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/donations";
import type { Template } from "@/lib/adminTemplates";

// Bwat pou admin nan voye yon mesaj bay yon moun: li chwazi yon modèl, li ka modifye l,
// epi li voye l sou WhatsApp, pa imèl, oswa li kopye l.
export function SendMessageBox({
  templates,
  whatsapp,
  email,
  subject,
  title = "✉️ Voye yon mesaj",
  onSent,
}: {
  templates: Template[];
  whatsapp?: string | null;
  email?: string | null;
  subject: string;
  title?: string;
  onSent?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [text, setText] = useState(templates[0]?.text ?? "");
  const [copied, setCopied] = useState(false);
  const ready = text.trim().length > 0;

  return (
    <div className="w-full space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      {/* Modèl yo */}
      <div className="flex flex-wrap gap-2">
        {templates.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setActive(i);
              setText(t.text);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active === i ? "border-citron-400 bg-citron-400 text-zinc-950" : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-fuchsia-500"
        aria-label="Mesaj la"
      />
      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={ready ? whatsappLink(whatsapp, text) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onSent?.()}
            className={`rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:opacity-90 ${ready ? "" : "pointer-events-none opacity-40"}`}
          >
            💬 Voye sou WhatsApp
          </a>
        )}
        {email && (
          <a
            href={ready ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : undefined}
            onClick={() => onSent?.()}
            className={`rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 ${ready ? "" : "pointer-events-none opacity-40"}`}
          >
            ✉️ Voye pa imèl
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
        >
          {copied ? "✓ Kopye" : "📋 Kopye mesaj la"}
        </button>
      </div>
      {!whatsapp && !email && <p className="text-xs text-amber-300">Pa gen WhatsApp ni imèl pou moun sa a: kopye mesaj la epi voye l jan w kapab.</p>}
    </div>
  );
}

// Chip rezon tou pare: klike sou youn pou l ranpli bwat rezon an
export function ReasonChips({ reasons, onPick }: { reasons: readonly string[]; onPick: (r: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onPick(r)}
          className="rounded-full border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-left text-xs text-red-200 transition hover:bg-red-500/15"
        >
          {r}
        </button>
      ))}
    </div>
  );
}
