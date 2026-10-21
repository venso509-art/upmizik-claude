"use client";

import { useEffect, useState, useTransition } from "react";
import { createAd, deleteAd, setAdActive } from "@/app/admin/pub/actions";
import { createClient } from "@/lib/supabase/client";
import { fileExtension } from "@/lib/upload";
import { formatDate } from "@/lib/finance";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { StatusBadge } from "@/components/StatusBadge";

export type AdminAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  clicks: number;
};

const AD_IMAGE_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const MAX_AD_BYTES = 3 * 1024 * 1024;

function adStatus(ad: AdminAd) {
  const now = Date.now();
  if (!ad.isActive) return { label: "⏸ Dezaktive", cls: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30" };
  if (ad.expiresAt && new Date(ad.expiresAt).getTime() <= now) return { label: "⌛ Ekspire", cls: "bg-red-500/15 text-red-300 ring-red-500/30" };
  if (new Date(ad.startsAt).getTime() > now) return { label: "🗓️ Pwograme", cls: "bg-sky-500/15 text-sky-300 ring-sky-500/30" };
  return { label: "🟢 Aktif", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" };
}

export function AdForm() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function pick(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!AD_IMAGE_TYPES[fileExtension(file)]) return setError("Imaj la dwe JPG, PNG, WebP oswa GIF.");
    if (file.size > MAX_AD_BYTES) return setError("Imaj la twò gwo. Maksimòm: 3 MB.");
    setImage(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!image) return setError("Chwazi imaj banyè a.");
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const supabase = createClient();
      const ext = fileExtension(image);
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("ads").upload(path, image, { contentType: AD_IMAGE_TYPES[ext] });
      if (uploadError) return setError(`Imaj la pa monte: ${uploadError.message}`);

      const res = await createAd({ title, imagePath: path, linkUrl: link, startsAt: startsAt || null, expiresAt: expiresAt || null });
      if (res.error) {
        await supabase.storage.from("ads").remove([path]);
        return setError(res.error);
      }
      setTitle("");
      setLink("");
      setStartsAt("");
      setExpiresAt("");
      setImage(null);
      setMessage("Piblisite a ajoute! Li parèt sou paj akèy la. ✅");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label
        className={`relative flex aspect-[4/1] min-h-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-fuchsia-500 ${
          pending ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Apèsi banyè a" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-zinc-400">
            🖼️ Chwazi imaj banyè a
            <span className="block text-xs text-zinc-500">Fòma lajè (4:1, egz: 1600×400) · JPG, PNG, WebP, GIF · Maks 3 MB</span>
          </span>
        )}
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tit (pou admin ak lektè ekran)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Egz: Konsè Kanaval 2027" className={inputClass} />
        </Field>
        <Field label="Lyen (kote moun nan ap ateri)">
          <input value={link} onChange={(e) => setLink(e.target.value)} required placeholder="https://..." className={inputClass} />
        </Field>
        <Field label="Kòmanse (opsyonèl, pa defo: kounye a)">
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Ekspire (opsyonèl)">
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <FormMessage error={error} message={message} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg btn-primary px-4 py-3 font-semibold transition disabled:opacity-60"
      >
        {pending ? "Ap ajoute..." : "📢 Ajoute piblisite a"}
      </button>
    </form>
  );
}

function AdRow({ ad }: { ad: AdminAd }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const status = adStatus(ad);

  return (
    <li className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:grid-cols-[12rem_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.imageUrl} alt={ad.title} className="aspect-[4/1] w-full rounded-lg object-cover sm:aspect-auto sm:h-full" />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-white">{ad.title}</p>
          <StatusBadge {...status} />
        </div>
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-fuchsia-400 hover:underline">
          {ad.linkUrl}
        </a>
        <p className="text-xs text-zinc-500">
          👆 <span className="font-semibold text-zinc-300">{ad.clicks.toLocaleString("fr-HT")}</span> klik · Depi {formatDate(ad.startsAt)}
          {ad.expiresAt ? ` · Ekspire ${formatDate(ad.expiresAt)}` : " · San ekspirasyon"}
        </p>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => startTransition(async () => setError((await setAdActive(ad.id, !ad.isActive)).error))}
            disabled={pending}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
          >
            {ad.isActive ? "⏸ Dezaktive" : "▶ Aktive"}
          </button>
          <button
            onClick={() => confirm(`Efase piblisite « ${ad.title} »?`) && startTransition(async () => setError((await deleteAd(ad.id)).error))}
            disabled={pending}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50"
          >
            🗑️ Efase
          </button>
        </div>
      </div>
    </li>
  );
}

export function AdList({ ads }: { ads: AdminAd[] }) {
  if (ads.length === 0) return <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">Poko gen piblisite.</p>;
  return (
    <ul className="space-y-3">
      {ads.map((ad) => (
        <AdRow key={ad.id} ad={ad} />
      ))}
    </ul>
  );
}
