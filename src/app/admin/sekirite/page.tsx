import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { describeAudit, describeUserAgent } from "@/lib/audit";
import { AdminTabs } from "@/components/admin/AdminTabs";

export const metadata: Metadata = { title: "Admin: Sekirite | UpMizik" };

type LoginRow = { id: string; email: string; user_id: string | null; success: boolean; ip: string | null; user_agent: string | null; created_at: string };
type AuditRow = { id: string; actor_id: string | null; action: string; details: Record<string, unknown>; created_at: string; actor: { display_name: string } | null };
type Suspicious = { kind: "email" | "ip"; value: string; failures: number; last_attempt: string };
// Detay kont yo (fonksyon admin_accounts). Modpas yo PA ladan: Supabase sere yo chifre, pèsonn pa ka li yo.
type Account = {
  id: string;
  display_name: string;
  role: string;
  status: string;
  email: string;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
};

const ROLE_LABEL: Record<string, string> = { artist: "🎤 Atis", listener: "🎧 Koutè" };

// Lyen WhatsApp pou yon nimewo (Ayiti pa defo si pa gen kòd peyi)
function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 8 ? `509${digits}` : digits}`;
}

const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "echek", label: "❌ Echèk" },
  { key: "admin", label: "🛡️ Admin sèlman" },
] as const;

function when(iso: string) {
  return new Date(iso).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Port-au-Prince" });
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const cls = { ok: "border-emerald-500/30 bg-emerald-500/5", warn: "border-amber-500/30 bg-amber-500/5", danger: "border-red-500/40 bg-red-500/10" }[tone];
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value.toLocaleString("fr-HT")}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function AdminSecurityPage({ searchParams }: { searchParams: { koneksyon?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const filter = FILTERS.find((f) => f.key === searchParams.koneksyon)?.key ?? "tout";
  const since24h = new Date(Date.now() - 86400 * 1000).toISOString();

  const { data: admins } = await supabase.rpc("admin_ids");
  const adminIds = ((admins ?? []) as string[]).map(String);

  let loginQuery = supabase
    .from("login_events")
    .select("id, email, user_id, success, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "echek") loginQuery = loginQuery.eq("success", false);
  if (filter === "admin") loginQuery = loginQuery.in("user_id", adminIds.length ? adminIds : ["00000000-0000-0000-0000-000000000000"]);

  const [{ data: logins }, { data: audit }, { data: suspicious }, ok24, fail24, { data: accountRows }] = await Promise.all([
    loginQuery.returns<LoginRow[]>(),
    supabase
      .from("audit_log")
      .select("id, actor_id, action, details, created_at, actor:profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AuditRow[]>(),
    supabase.rpc("admin_suspicious_logins"),
    supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", true).gte("created_at", since24h),
    supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", false).gte("created_at", since24h),
    // Vid si migration 20261204000000 poko kouri
    supabase.rpc("admin_accounts", { p_limit: 200 }),
  ]);
  const accounts = (accountRows ?? []) as Account[];
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const alerts = (suspicious ?? []) as Suspicious[];
  const adminSet = new Set(adminIds);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🔐 Sekirite ak jounal aktivite</h1>
      <p className="mt-1 text-zinc-400">Koneksyon yo, tantativ sispèk yo, ak tout gwo chanjman ki fèt sou platfòm nan.</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="✅ Koneksyon (24 è)" value={ok24.count ?? 0} tone="ok" />
        <Stat label="❌ Echèk (24 è)" value={fail24.count ?? 0} tone="warn" />
        <Stat label="⚠️ Tantativ sispèk (1 è)" value={alerts.length} tone={alerts.length ? "danger" : "ok"} />
      </section>

      <div className="mt-6 space-y-6">
        {/* ===== ALÈT ===== */}
        <Panel title="⚠️ Tantativ sispèk" subtitle="Imèl oswa IP ki gen 5 move modpas oswa plis nan dènye èdtan an.">
          {alerts.length === 0 ? (
            <p className="py-4 text-center text-sm text-emerald-300">✅ Anyen sispèk nan dènye èdtan an.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={`${a.kind}-${a.value}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm">
                  <span className="text-red-200">
                    {a.kind === "email" ? "📧" : "🌐"} <span className="font-semibold">{a.value}</span>
                  </span>
                  <span className="text-red-300">
                    {a.failures} echèk · dènye: {when(a.last_attempt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ===== KONEKSYON ===== */}
        <Panel title="🔑 Koneksyon yo" subtitle="100 dènye tantativ koneksyon sou sit la.">
          <nav className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/admin/sekirite?koneksyon=${f.key}`}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  filter === f.key ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
          {(logins ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Poko gen koneksyon nan kategori sa a.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Dat</th>
                    <th className="py-2 pr-3 font-medium">Imèl</th>
                    <th className="py-2 pr-3 font-medium">Rezilta</th>
                    <th className="py-2 pr-3 font-medium">IP</th>
                    <th className="py-2 font-medium">Aparèy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {(logins ?? []).map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-400">{when(l.created_at)}</td>
                      <td className="py-2.5 pr-3 text-zinc-200">
                        {l.user_id && accountById.get(l.user_id) && (
                          <span className="block font-semibold text-white">{accountById.get(l.user_id)!.display_name}</span>
                        )}
                        {l.email}
                        {l.user_id && adminSet.has(l.user_id) && <span className="ml-1.5 text-xs text-amber-300">🛡️</span>}
                        {l.user_id && accountById.get(l.user_id)?.phone && (
                          <span className="block text-xs text-zinc-500">📱 {accountById.get(l.user_id)!.phone}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{l.success ? <span className="text-emerald-300">✅ Reyisi</span> : <span className="text-red-300">❌ Echwe</span>}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-zinc-400">{l.ip ?? "—"}</td>
                      <td className="py-2.5 text-zinc-400">{describeUserAgent(l.user_agent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ===== KONT YO ===== */}
        <Panel
          title="👥 Kont yo"
          subtitle="Tout moun ki enskri: non, imèl, telefòn, lè yo kreye kont lan ak dènye fwa yo konekte. Modpas yo pa vizib: yo chifre, pèsonn pa ka li yo."
        >
          {accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Kouri migration 20261204000000_admin_alerts_accounts.sql pou w wè kont yo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Moun nan</th>
                    <th className="py-2 pr-3 font-medium">Imèl</th>
                    <th className="py-2 pr-3 font-medium">Telefòn</th>
                    <th className="py-2 pr-3 font-medium">Enskri</th>
                    <th className="py-2 font-medium">Dènye koneksyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 pr-3">
                        <span className="block font-semibold text-white">
                          {a.display_name}
                          {adminSet.has(a.id) && <span className="ml-1.5 text-xs text-amber-300">🛡️</span>}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {ROLE_LABEL[a.role] ?? a.role}
                          {a.status !== "approved" ? ` · ${a.status}` : ""}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-zinc-300">
                        {a.email}
                        {!a.email_confirmed && <span className="ml-1.5 text-xs text-amber-300">(poko konfime)</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        {a.phone ? (
                          <a href={waLink(a.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                            📱 {a.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-400">{when(a.created_at)}</td>
                      <td className="whitespace-nowrap py-2.5 text-zinc-400">{a.last_sign_in_at ? when(a.last_sign_in_at) : "Poko konekte"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ===== JOUNAL AKTIVITE ===== */}
        <Panel title="📜 Jounal aktivite" subtitle="100 dènye gwo chanjman: kiyès ki fè yo, ak kilè.">
          {(audit ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Poko gen aktivite anrejistre.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/70">
              {(audit ?? []).map((a) => {
                const { icon, text } = describeAudit(a.action, a.details ?? {});
                return (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                    <span className="min-w-0 text-zinc-200">
                      <span className="mr-2">{icon}</span>
                      <span className="font-semibold text-white">{a.actor?.display_name ?? "Sistèm nan"}</span>{" "}
                      <span className="text-zinc-400">·</span> {text}
                    </span>
                    <span className="whitespace-nowrap text-xs text-zinc-500">{when(a.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
