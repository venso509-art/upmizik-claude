"use client";

import { useState, useTransition } from "react";
import { sendDirectMessage } from "@/app/admin/mesaj/actions";
import { whatsappLink } from "@/lib/donations";
import { FormMessage, inputClass } from "@/components/auth/ui";

// Mesaj tou pare pou admin nan pa oblije ekri yo chak fwa
const TEMPLATES = [
  {
    label: "✅ Kont apwouve",
    text: (name: string) =>
      `Bonjou ${name}! 🎉\n\nKont atis ou sou UpMizik apwouve. Ou ka konekte kounye a sou https://upmizik.com/konekte, epi kòmanse pibliye mizik ou.\n\nByenvini nan fanmi an!\n— Ekip UpMizik`,
  },
  {
    label: "❌ Prèv la pa klè",
    text: (name: string) =>
      `Bonjou ${name},\n\nNou pa t ka verifye prèv peman frè enskripsyon w lan (foto a pa klè oswa montan an pa kòrèk). Konekte sou https://upmizik.com/konekte pou w voye yon nouvo prèv.\n\nMèsi!\n— Ekip UpMizik`,
  },
];

// Bwat pou admin nan kontakte yon atis manyèlman: imèl, WhatsApp, oswa mesaj sou sit la
export function ArtistContactBox({ artistId, name, email, phone }: { artistId: string; name: string; email: string | null; phone: string | null }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ error?: string; message?: string }>();
  const [pending, startTransition] = useTransition();
  const subject = "UpMizik: kont atis ou";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white">
        ✉️ Kontakte atis la
      </button>
    );
  }

  const canSend = body.trim().length > 0;

  return (
    <div className="w-full space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setBody(t.text(name))}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder={`Mesaj pou ${name}...`}
        className={`${inputClass} resize-y text-sm`}
      />
      <FormMessage error={result?.error} message={result?.message} />
      <div className="flex flex-wrap gap-2">
        {email ? (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            className={`rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 ${canSend ? "" : "pointer-events-none opacity-40"}`}
          >
            ✉️ Imèl ({email})
          </a>
        ) : null}
        {phone ? (
          <a
            href={whatsappLink(phone, body)}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:opacity-90 ${canSend ? "" : "pointer-events-none opacity-40"}`}
          >
            💬 WhatsApp ({phone})
          </a>
        ) : (
          <span className="self-center text-xs text-zinc-500">Pa gen nimewo WhatsApp</span>
        )}
        <button
          type="button"
          disabled={!canSend || pending}
          onClick={() => startTransition(async () => setResult(await sendDirectMessage(artistId, subject, body)))}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:opacity-40"
        >
          {pending ? "..." : "🔔 Sou sit la"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto px-2 text-xs text-zinc-500 hover:text-white">
          Fèmen
        </button>
      </div>
    </div>
  );
}
