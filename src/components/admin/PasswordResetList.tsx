"use client";

import { useState, useTransition } from "react";
import { setPasswordResetStatus } from "@/app/admin/actions";
import { whatsappLink } from "@/lib/donations";

export type AdminPasswordReset = {
  id: string;
  name: string;
  email: string;
  contactKind: "whatsapp" | "email";
  contact: string;
  code: string;
  status: "pending" | "sent" | "used" | "locked" | "cancelled";
  attempts: number;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  usedAt: string | null;
};

const STATUS_LABEL: Record<AdminPasswordReset["status"], string> = {
  pending: "⏳ Pou voye",
  sent: "📨 Voye",
  used: "✅ Modpas chanje",
  locked: "⛔ Bloke (5 move kòd)",
  cancelled: "🚫 Anile",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short" });

// Mesaj la ki prale bay moun nan (WhatsApp oswa imèl)
export function resetMessage(r: Pick<AdminPasswordReset, "name" | "email" | "code">) {
  return (
    `Bonjou ${r.name}! 👋\n\n` +
    `Men kòd UpMizik ou pou chanje modpas ou: ${r.code}\n\n` +
    `1. Ale sou upmizik.com/konekte\n` +
    `2. Mete imèl ou: ${r.email}\n` +
    `3. Klike « Mete kòd la »\n` +
    `4. Kole kòd la epi chwazi yon nouvo modpas.\n\n` +
    `Kòd la valab 48 èdtan. Pa bay pèsonn kòd sa a.\n\n— Ekip UpMizik`
  );
}

function ResetCard({ r }: { r: AdminPasswordReset }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<"code" | "message" | null>(null);
  const active = r.status === "pending" || r.status === "sent";
  const expired = active && new Date(r.expiresAt) < new Date();
  const message = resetMessage(r);

  async function copy(what: "code" | "message") {
    try {
      await navigator.clipboard.writeText(what === "code" ? r.code : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Kopi a pa mache: chwazi tèks la ak dwèt ou.");
    }
  }

  function setStatus(status: "sent" | "cancelled") {
    setError(undefined);
    startTransition(async () => {
      const res = await setPasswordResetStatus(r.id, status);
      if (res.error) setError(res.error);
    });
  }

  const sendHref =
    r.contactKind === "whatsapp"
      ? whatsappLink(r.contact, message)
      : `mailto:${r.contact}?subject=${encodeURIComponent("Kòd UpMizik pou chanje modpas ou")}&body=${encodeURIComponent(message)}`;

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">{r.name}</p>
          <p className="break-all text-sm text-zinc-400">{r.email}</p>
          <p className="mt-1 break-all text-sm text-zinc-300">
            {r.contactKind === "whatsapp" ? "📱 WhatsApp:" : "✉️ Imèl:"} <b>{r.contact}</b>
          </p>
        </div>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{expired ? "⌛ Ekspire" : STATUS_LABEL[r.status]}</span>
      </div>

      <p className="mt-3 text-sm text-zinc-400">
        Pwoblèm nan: moun sa a bliye modpas li e li mande yon kòd pou l chanje l. Voye kòd la ba li sou{" "}
        {r.contactKind === "whatsapp" ? "WhatsApp" : "imèl"} li.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-xl border border-citron-400/40 bg-citron-400/10 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-citron-300">
          {r.code}
        </span>
        <button type="button" onClick={() => copy("code")} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          {copied === "code" ? "✅ Kopye" : "📋 Kopye kòd la"}
        </button>
        <button type="button" onClick={() => copy("message")} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          {copied === "message" ? "✅ Kopye" : "📋 Kopye mesaj la"}
        </button>
      </div>

      {active && !expired && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={sendHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => r.status === "pending" && setStatus("sent")}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            {r.contactKind === "whatsapp" ? "📱 Voye sou WhatsApp" : "✉️ Voye pa imèl"}
          </a>
          {r.status === "pending" && (
            <button type="button" disabled={pending} onClick={() => setStatus("sent")} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">
              ✔️ Mwen voye l deja
            </button>
          )}
          <button type="button" disabled={pending} onClick={() => setStatus("cancelled")} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50">
            Anile
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-500">
        Mande: {fmt(r.createdAt)}
        {r.sentAt && ` · Voye: ${fmt(r.sentAt)}`}
        {r.usedAt && ` · Chanje: ${fmt(r.usedAt)}`}
        {r.attempts > 0 && ` · Move kòd: ${r.attempts}/5`}
        {active && !expired && ` · Ekspire: ${fmt(r.expiresAt)}`}
      </p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </li>
  );
}

export function PasswordResetList({ requests }: { requests: AdminPasswordReset[] }) {
  if (!requests.length) return <p className="rounded-xl border border-zinc-800 p-6 text-center text-zinc-400">Pa gen demann isit la.</p>;
  return (
    <ul className="space-y-4">
      {requests.map((r) => (
        <ResetCard key={r.id} r={r} />
      ))}
    </ul>
  );
}
