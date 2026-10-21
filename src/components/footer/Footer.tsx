import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { SocialIcons } from "./SocialIcons";

function FooterLinks({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-zinc-400 transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, role").eq("id", user.id).single()
    : { data: null };
  const year = new Date().getFullYear();

  return (
    // pb-24: pou ba lektè a (fiks anba ekran an) pa kouvri dènye liy lan; pb-44 sou telefòn pou ba navigasyon an tou
    <footer className="mt-12 border-t border-zinc-800 bg-zinc-950 pb-44 md:pb-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
        {/* Mak la + rezo sosyal */}
        <div>
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">Up</span>
            <span className="text-white">Mizik</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-zinc-400">Platfòm mizik 100% ayisyen. Koute, sipòte atis yo, epi pataje bèl mizik nou an ak mond lan.</p>
          <div className="mt-5">
            <SocialIcons />
          </div>
        </div>

        <FooterLinks
          title="Dekouvri"
          links={[
            { href: "/", label: "Akèy" },
            { href: "/#nouvo", label: "Nouvo mizik" },
            { href: "/atis", label: "🎤 Atis yo" },
            { href: "/sosyal", label: "💬 Sosyal" },
            { href: "/chache", label: "🔍 Chache" },
            { href: "/telechaje", label: "📥 Mizik offline" },
          ]}
        />

        <FooterLinks
          title="Pou atis"
          links={[
            { href: "/enskri", label: "Enskri kòm atis" },
            { href: "/dashboard", label: "Espas atis" },
            { href: "/upload", label: "Pibliye yon chante" },
          ]}
        />

        {/* Newsletter + estati koneksyon */}
        <div>
          <p className="text-sm font-semibold text-white">📬 Newsletter</p>
          <p className="mt-1 text-sm text-zinc-400">Nouvo mizik ak nouvèl UpMizik dirèkteman nan imèl ou.</p>
          <div className="mt-4">
            <NewsletterForm />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            {user ? (
              <>
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  Anliy
                </span>
                <span className="min-w-0 truncate text-sm text-zinc-300">{profile?.display_name ?? user.email}</span>
                <Link
                  href={profile?.role === "artist" ? "/dashboard" : "/pwofil"}
                  className="ml-auto text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300"
                >
                  {profile?.role === "artist" ? "Espas atis →" : "Pwofil →"}
                </Link>
              </>
            ) : (
              <>
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  Offline
                </span>
                <Link href="/konekte" className="ml-auto rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700">
                  Konekte
                </Link>
                <Link
                  href="/enskri"
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  Enskri
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dènye liy lan */}
      <div className="border-t border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-zinc-500 sm:flex-row">
          <p>© {year} UpMizik. Tout dwa rezève.</p>
          <p>
            Kontak:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
