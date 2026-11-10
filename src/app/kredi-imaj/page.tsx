import type { Metadata } from "next";
import credits from "@/lib/giftPhotoCredits.json";

export const metadata: Metadata = { title: "Kredi imaj | UpMizik" };

// Lisans foto kado yo mande pou nou site moun ki pran yo (Wikimedia Commons)
export default function ImageCreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-white">Kredi imaj</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Foto kado yo soti sou Wikimedia Commons, anba lisans lib. Mèsi a fotograf yo. Ti kado live yo se Fluent Emoji © Microsoft (lisans MIT).
      </p>
      <ul className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {credits.map((c) => (
          <li key={c.id} className="flex items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/gifts/foto/${c.file}`} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover" />
            <div className="min-w-0 text-sm">
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold text-white hover:underline">
                {c.title}
              </a>
              <p className="truncate text-xs text-zinc-400">
                {c.artist || "Otè enkoni"} · {c.license}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
