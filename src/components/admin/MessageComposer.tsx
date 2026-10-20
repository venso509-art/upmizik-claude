"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { sendAdminMessage } from "@/app/admin/mesaj/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

export type Recipient = { id: string; name: string; email: string };

export function MessageComposer({ artists }: { artists: Recipient[] }) {
  const [state, formAction] = useFormState(sendAdminMessage, undefined);
  const [to, setTo] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Apre yon mesaj voye, vide fòm nan pou pwochen an
  useEffect(() => {
    if (state?.message) {
      setTitle("");
      setBody("");
    }
  }, [state]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form
        action={(formData) => {
          if (to === "all" && !confirm(`Voye mesaj sa a bay TOUT ${artists.length} atis yo?`)) return;
          formAction(formData);
        }}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <Field label="Pou kiyès?">
          <select name="to" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass}>
            <option value="all">📢 Tout atis yo ({artists.length})</option>
            <optgroup label="Yon sèl atis">
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.email}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="Tit">
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Egz: Nouvo fonksyon sou UpMizik!" className={inputClass} />
        </Field>
        <Field label="Mesaj">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
            rows={7}
            placeholder="Ekri mesaj ou a isit la..."
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{body.length}/2000</p>
        </Field>
        <FormMessage error={state?.error} message={state?.message} />
        <SubmitButton>📣 Voye mesaj la</SubmitButton>
      </form>

      {/* Apèsi: jan atis la ap wè l nan bwat li */}
      <div>
        <p className="mb-3 text-sm font-medium text-zinc-400">Apèsi</p>
        <div className="rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/[0.07] p-5">
          <div className="flex items-start gap-3">
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-fuchsia-500" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-white">{title || "Tit mesaj la"}</p>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">📣 Ekip UpMizik</span>
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-300">{body || "Kontni mesaj la ap parèt isit la."}</p>
              <p className="mt-3 text-xs text-zinc-500">kounye a</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
