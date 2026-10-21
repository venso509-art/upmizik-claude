"use client";

import { useState, useTransition } from "react";
import { sendDirectMessage } from "@/app/admin/mesaj/actions";
import { whatsappLink } from "@/lib/donations";
import { approvedMessage, rejectedMessage } from "@/lib/artistMessages";
import { FormMessage, inputClass } from "@/components/auth/ui";

// Bwat pou admin nan kontakte yon atis manyèlman: imèl, WhatsApp, oswa mesaj sou sit la.
// defaultBody: mesaj ki deja ekri (egz: dapre desizyon apwouve/rejte a).
export function ArtistContactBox({
  artistId,
  name,
  email,
  phone,
  defaultBody = "",
  reason = null,
  initiallyOpen = false,
  showInApp = true,
  onClose,
}: {
  artistId: string;
  name: string;
  email: string | null;
  phone: string | null;
  defaultBody?: string;
  reason?: string | null;
  initiallyOpen?: boolean;
  showInApp?: boolean; // fo lè mesaj sou sit la deja voye otomatikman
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [body, setBody] = useState(defaultBody);
  const [result, setResult] = useState<{ error?: string; message?: string }>();
  const [pending, startTransition] = useTransition();
  const subject = "UpMizik: kont atis ou";

  if (!open) {
    return (
      <button
        onClick={() => {
          setBody(defaultBody);
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
      >
        ✉️ Kontakte atis la
      </button>
    );
  }

  const canSend = body.trim().length > 0;
  const templates = [
    { label: "✅ Kont apwouve", text: approvedMessage(name) },
    { label: "❌ Prèv rejte", text: rejectedMessage(name, reason) },
  ];

  return (
    <div className="w-full space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setBody(t.text)}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        maxLength={2000}
        placeholder={`Mesaj pou ${name}...`}
        className={`${inputClass} resize-y text-sm`}
      />
      <FormMessage error={result?.error} message={result?.message} />
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a
            href={whatsappLink(phone, body)}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 ${canSend ? "" : "pointer-events-none opacity-40"}`}
          >
            💬 WhatsApp ({phone})
          </a>
        ) : (
          <span className="self-center text-xs text-zinc-500">Pa gen nimewo WhatsApp</span>
        )}
        {email ? (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            className={`rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 ${canSend ? "" : "pointer-events-none opacity-40"}`}
          >
            ✉️ Imèl ({email})
          </a>
        ) : null}
        {showInApp && (
          <button
            type="button"
            disabled={!canSend || pending}
            onClick={() => startTransition(async () => setResult(await sendDirectMessage(artistId, subject, body)))}
            className="rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:opacity-40"
          >
            {pending ? "..." : "🔔 Sou sit la"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
          className="ml-auto px-2 text-xs text-zinc-500 hover:text-white"
        >
          Fèmen
        </button>
      </div>
    </div>
  );
}
