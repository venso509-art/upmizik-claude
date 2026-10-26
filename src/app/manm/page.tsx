import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberJoin } from "@/components/member/MemberJoin";

export const metadata: Metadata = {
  title: "Vin manm afilye | UpMizik",
  description: "Ede atis ayisyen yo enskri sou UpMizik epi touche lajan chak mwa.",
};
export const dynamic = "force-dynamic";

// Avantaj piblik yo (SAN montan): kòb la parèt sèlman nan kontra a, lè moun nan di l vle vin manm
const PERKS = [
  { icon: "🎤", title: "Ede atis ayisyen yo", text: "Fè talan ou konnen yo rantre sou platfòm mizik 100% ayisyen an." },
  { icon: "🎁", title: "2 jou promo pou atis yo", text: "Atis ki enskri ak pseudo ou parèt an premye sou UpMizik pandan 2 jou." },
  { icon: "📊", title: "Espas manm pa w", text: "Swiv objektif ou, atis ou fè enskri yo ak pwogrè ou chak jou." },
  { icon: "📲", title: "Peman chak mwa", text: "Ekip la peye w pa MonCash oswa NatCash." },
];

// Paj "Vin manm afilye": prezantasyon + fòm demann nan
export default async function MemberPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: member }, { data: profile }] = user
    ? await Promise.all([
        supabase.from("members").select("status, admin_note").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  if (member?.status === "approved") redirect("/manm/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* ===== TÈT ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-700 via-fuchsia-800 to-[#0B132B] p-7 shadow-2xl ring-1 ring-white/10 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-[#FFD700]/25 blur-3xl" aria-hidden />
        <p className="relative inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#FFE34D] ring-1 ring-white/15">
          🤝 Pwogram manm afilye
        </p>
        <h1 className="relative mt-4 text-balance text-3xl font-black leading-tight text-white sm:text-5xl">
          Ede atis yo monte. <span className="text-[#FFE34D]">Touche chak mwa.</span>
        </h1>
        <p className="relative mt-3 max-w-xl text-white/80">
          Pataje pseudo ou ak atis ou konnen. Chak atis ki enskri ak li epi ki apwouve konte pou ou, e li jwenn 2 jou promo sou UpMizik.
        </p>
      </section>

      {/* ===== AVANTAJ YO ===== */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {PERKS.map((p) => (
          <li key={p.title} className="flex gap-3 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/10">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-xl" aria-hidden>
              {p.icon}
            </span>
            <span>
              <span className="block font-bold text-white">{p.title}</span>
              <span className="text-sm text-zinc-400">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* ===== FÒM NAN / ESTATI DEMANN NAN ===== */}
      <section className="mt-8 rounded-3xl bg-zinc-900/60 p-6 ring-1 ring-white/10 sm:p-8">
        {!user ? (
          <div className="text-center">
            <p className="text-lg font-bold text-white">Konekte pou w voye demann ou</p>
            <p className="mt-1 text-sm text-zinc-400">Ou bezwen yon kont UpMizik (gratis) pou w vin manm.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/konekte" className="rounded-full bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15">
                Konekte
              </Link>
              <Link href="/enskri" className="btn-primary rounded-full px-5 py-3 font-bold">
                Kreye yon kont
              </Link>
            </div>
          </div>
        ) : member?.status === "pending" ? (
          <div className="text-center">
            <p className="text-4xl">⏳</p>
            <p className="mt-2 text-lg font-bold text-white">Demann ou an ap tann</p>
            <p className="mt-1 text-sm text-zinc-400">Ekip UpMizik la ap verifye l. W ap resevwa pseudo ou ak yon notifikasyon depi yo apwouve l.</p>
          </div>
        ) : member?.status === "blocked" ? (
          <div className="text-center">
            <p className="text-4xl">⛔</p>
            <p className="mt-2 text-lg font-bold text-white">Kont manm ou bloke</p>
            <p className="mt-1 text-sm text-zinc-400">{member.admin_note ?? "Kontakte ekip UpMizik la pou plis enfòmasyon."}</p>
          </div>
        ) : (
          <MemberJoin defaultName={profile?.display_name ?? ""} defaultEmail={user.email ?? ""} />
        )}
      </section>
    </div>
  );
}
