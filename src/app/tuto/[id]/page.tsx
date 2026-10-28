import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TUTORIALS } from "@/lib/tutorials";

// Paj yon tuto: atis la rive la lè l peze « Wè detay » nan mesaj yon manm voye ba li
type Props = { params: { id: string } };

export function generateStaticParams() {
  return TUTORIALS.map((t) => ({ id: t.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const t = TUTORIALS.find((x) => x.id === params.id);
  return { title: t ? `${t.question} | UpMizik` : "Tuto | UpMizik", description: t?.intro };
}

export default function TutorialPage({ params }: Props) {
  const index = TUTORIALS.findIndex((x) => x.id === params.id);
  if (index < 0) notFound();
  const t = TUTORIALS[index];
  const next = TUTORIALS[(index + 1) % TUTORIALS.length];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-bold uppercase tracking-widest text-citron-300">📘 Tuto {index + 1} / {TUTORIALS.length}</p>
      <h1 className="mt-2 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
        <span aria-hidden>{t.icon}</span> {t.question}
      </h1>
      <p className="mt-3 text-zinc-300">{t.intro}</p>

      <ol className="mt-8 space-y-3">
        {t.steps.map((step, n) => (
          <li
            key={n}
            className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 motion-safe:animate-fade-up"
            style={{ animationDelay: `${0.1 + n * 0.08}s` }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-citron-400 text-sm font-black text-zinc-950">{n + 1}</span>
            <span className="pt-1.5 text-[15px] text-zinc-100">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={t.path} className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-black">
          Eseye l kounye a →
        </Link>
        <Link href={`/tuto/${next.id}`} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-citron-400 hover:text-white">
          Pwochen tuto: {next.icon} {next.question}
        </Link>
      </div>
    </div>
  );
}
