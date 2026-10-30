import { notFound } from "next/navigation";
import { DailyQuoteCard } from "@/components/quotes/DailyQuoteCard";
import { ExportTest } from "./ExportTest";
import { DailyQuoteStudio } from "@/components/quotes/DailyQuoteStudio";
import { ArtistCockpit } from "@/components/dashboard/ArtistCockpit";
import { TEMPLATE_NAMES, type QuoteFormat, type QuoteTemplate } from "@/lib/dailyQuotes";

// Paj tès (devlopman sèlman): 6 desen × Feed/Story ak sitasyon ki pi long lan ak yon non long.
// Li parèt sèlman si ENABLE_DEV_PAGES=1 (pa janm sou sit la).
export const dynamic = "force-dynamic";

// Sitasyon ki pi long nan lis la (87 karaktè)
const LONG = "Zòrèy mwen fè sa yo vle: lè manman m rele m, yo tande; lè l mande m fè travay, yo soud.";
const SAMPLES = [
  { teks: "Chak chante mwen ekri se yon pa pi pre rèv mwen.", sous: null, name: "Melodi Lakay", genre: "Konpa" },
  { teks: LONG, sous: null, name: "Jean-Baptiste Ti Pyè Mizik Lakay", genre: "Rap Kreyòl" },
  { teks: "Dèyè mòn gen mòn.", sous: "Pwovèb ayisyen", name: "Rasin Kreyòl", genre: null },
];

export default function DevQuotesPage({ searchParams }: { searchParams: { s?: string; f?: string; ekspo?: string; foto?: string; studio?: string; pro?: string; kokpit?: string } }) {
  if (process.env.ENABLE_DEV_PAGES !== "1") notFound();
  // ?kokpit=1&pro=1: tèt dashboard atis la ak done egzanp
  if (searchParams.kokpit) {
    const daily = Array.from({ length: 30 }, (_, i) => ({
      day: new Date(Date.UTC(2026, 9, i + 1)).toISOString().slice(0, 10),
      plays: Math.round(20 + 15 * Math.sin(i / 3) + i * 2.2),
    }));
    return (
      <div style={{ maxWidth: 1150, margin: "0 auto", padding: 16 }}>
        <ArtistCockpit
          artistId="00000000-0000-0000-0000-000000000000"
          name="Melodi Lakay"
          avatarUrl={searchParams.foto ?? null}
          verified
          pro={searchParams.pro === "1"}
          greeting="Bonjou"
          totalPlays={2480}
          songs={12}
          comments={86}
          followers={searchParams.pro === "1" ? 340 : null}
          availableHtg={7250}
          monthHtg={1450}
          daily={daily}
          memberCode="MELODI2026"
          shareText="Sipòte m sou UpMizik"
        />
      </div>
    );
  }
  // ?studio=1&pro=1: espas "Mesaj jounen an" jan atis la wè l nan dashboard la
  if (searchParams.studio) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
        <DailyQuoteStudio
          card={{ day: "2026-10-28", template: 4, quote: { teks: SAMPLES[0].teks, kategori: "mizik", etiket: "Mizik", sous: null } }}
          artist={{ id: "00000000-0000-0000-0000-000000000000", name: "Melodi Lakay", avatarUrl: searchParams.foto ?? null, genre: "Konpa" }}
          pro={searchParams.pro === "1"}
        />
      </div>
    );
  }
  // ?ekspo=5&f=story&foto=<url>: tès imaj PNG la (menm fason ak espas atis la)
  if (searchParams.ekspo) {
    const t = Math.min(6, Math.max(1, Number(searchParams.ekspo) || 1)) as QuoteTemplate;
    const f = (["feed", "story", "square"].includes(searchParams.f ?? "") ? searchParams.f : "feed") as QuoteFormat;
    return (
      <div style={{ padding: 16, background: "#333" }}>
        <ExportTest template={t} format={f} avatarUrl={searchParams.foto ?? null} />
      </div>
    );
  }
  const sample = SAMPLES[Number(searchParams.s) || 0] ?? SAMPLES[0];
  const format = (["feed", "story", "square"].includes(searchParams.f ?? "") ? searchParams.f : "feed") as QuoteFormat;
  const scale = 0.32;
  const h = format === "story" ? 1920 : format === "square" ? 1080 : 1350;

  return (
    <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 16, background: "#333" }}>
      {([1, 2, 3, 4, 5, 6] as QuoteTemplate[]).map((t) => (
        <div key={t}>
          <p style={{ color: "#fff", fontSize: 12, margin: "0 0 4px" }}>
            {t}. {TEMPLATE_NAMES[t]}
          </p>
          <div style={{ width: 1080 * scale, height: h * scale, overflow: "hidden" }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <DailyQuoteCard
                template={t}
                format={format}
                day="2026-10-28"
                quote={{ teks: sample.teks, kategori: "motivasyon", etiket: "Motivasyon", sous: sample.sous }}
                artist={{ name: sample.name, avatarUrl: t % 2 ? "/logo.jpg" : null, genre: sample.genre }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
