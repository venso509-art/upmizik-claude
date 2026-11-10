"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Portal } from "@/components/Portal";
import { FormMessage } from "@/components/auth/ui";
import { BasketIcon, DownloadIcon } from "@/components/sales/SaleIcons";

// 🛒 Achte yon chante oswa tout yon pwojè ak kredi (migration 20270101000016_music_sales.sql).
// Koute a rete gratis; se telechajman fichye a ki peye. Mizik la ale nan "Acha mwen yo" (paj offline la).
export function BuyButton({
  kind,
  id,
  price,
  title,
  artistName,
  owned,
  loggedIn,
  className = "",
  size = "md",
}: {
  kind: "song" | "release";
  id: string;
  price: number;
  title: string;
  artistName: string;
  owned: boolean;
  loggedIn: boolean;
  className?: string;
  size?: "md" | "sm"; // sm: ti bouton akote chak chante nan yon lis
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [have, setHave] = useState(owned);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  useEffect(() => setHave(owned), [owned]);

  useEffect(() => {
    if (!open || !loggedIn) return;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("credit_wallets").select("balance").eq("user_id", user.id).maybeSingle();
      setBalance(data?.balance ?? 0);
    })();
  }, [open, loggedIn]);

  async function buy() {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const { data, error: err } =
      kind === "song" ? await supabase.rpc("buy_song", { p_song: id }) : await supabase.rpc("buy_release", { p_release: id });
    setBusy(false);
    if (err) return setError(err.message.includes("ase kredi") ? "Ou pa gen ase kredi 🪙. Achte kredi anvan." : err.message);
    if (typeof data === "number") setBalance(data);
    setHave(true);
    setDone(true);
    router.refresh();
  }

  const what = kind === "song" ? "chante sa a" : "tout pwojè a";
  const downloadHref = kind === "song" ? `/api/acha/telechaje/${id}` : "/telechaje#acha";

  const sm = size === "sm";

  if (have && !open) {
    return (
      <a
        href={downloadHref}
        title="Ou achte l: telechaje l"
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 font-bold text-emerald-300 ring-1 ring-emerald-500/40 transition hover:bg-emerald-500/25 ${
          sm ? "px-2.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
        } ${className}`}
      >
        <DownloadIcon className={sm ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {sm ? "Pa w" : kind === "song" ? "Telechaje" : "Wè nan Acha mwen yo"}
      </a>
    );
  }

  const enough = balance !== null && balance >= price;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Achte ${what} · ${price} kredi`}
        className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#FFE97A] to-[#E6C000] font-black text-[#0B132B] shadow-md shadow-[#FFD700]/25 ring-1 ring-inset ring-white/40 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFD700]/35 active:scale-95 ${
          sm ? "px-2.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
        } ${className}`}
      >
        <BasketIcon className={`transition duration-300 group-hover:-rotate-6 ${sm ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
        {!sm && (kind === "song" ? "Achte" : "Achte tout pwojè a")}
        <span className={sm ? "tabular-nums" : "rounded-full bg-[#0B132B]/10 px-2 py-0.5 tabular-nums"}>🪙 {price.toLocaleString("fr-HT")}</span>
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <div className="space-y-4 text-center">
                  <p className="text-5xl">🎉</p>
                  <h2 className="text-xl font-extrabold text-white">Se pou ou kounye a!</h2>
                  <p className="text-sm text-zinc-300">
                    « {title} » nan <span className="font-semibold text-white">Acha mwen yo</span> (paj 📥 Offline). Ou ka telechaje l nenpòt lè, menm si w pèdi l.
                  </p>
                  <a href={downloadHref} className="flex w-full items-center justify-center gap-2 rounded-xl btn-primary px-4 py-3 font-semibold">
                    <DownloadIcon /> {kind === "song" ? "Telechaje kounye a" : "Ale nan Acha mwen yo"}
                  </a>
                  <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-400 hover:text-white">
                    Fèmen
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD700]">
                      <BasketIcon className="h-3.5 w-3.5" /> Achte {what}
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-white">{title}</h2>
                    <p className="text-sm text-zinc-400">{artistName}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3">
                    <span className="text-sm text-zinc-400">Pri</span>
                    <span className="text-2xl font-black text-white">🪙 {price.toLocaleString("fr-HT")}</span>
                  </div>

                  {!loggedIn ? (
                    <div className="space-y-3 text-center">
                      <p className="text-sm text-zinc-300">Pou achte mizik, ou bezwen yon kont koutè ak kredi.</p>
                      <div className="flex gap-2">
                        <Link href="/konekte" className="flex-1 rounded-xl btn-primary px-4 py-3 text-center font-semibold">
                          Konekte
                        </Link>
                        <Link href="/enskri" className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-center font-semibold text-zinc-200">
                          Kreye kont
                        </Link>
                      </div>
                    </div>
                  ) : balance === null ? (
                    <p className="py-2 text-center text-sm text-zinc-500">Chajman…</p>
                  ) : (
                    <>
                      <p className="text-center text-sm text-zinc-400">
                        Kredi ou: <span className="font-bold text-white">🪙 {balance.toLocaleString("fr-HT")}</span>
                        {enough && <> → rete 🪙 {(balance - price).toLocaleString("fr-HT")}</>}
                      </p>
                      <FormMessage error={error} />
                      {enough ? (
                        <button type="button" disabled={busy} onClick={buy} className="w-full rounded-xl btn-primary px-4 py-3 font-semibold disabled:opacity-50">
                          {busy ? "Ap achte…" : `Konfime acha a · 🪙 ${price.toLocaleString("fr-HT")}`}
                        </button>
                      ) : (
                        <Link href="/kredi" className="block w-full rounded-xl btn-primary px-4 py-3 text-center font-semibold">
                          🪙 Ou bezwen {(price - balance).toLocaleString("fr-HT")} kredi anplis: achte kredi
                        </Link>
                      )}
                    </>
                  )}
                  <p className="text-center text-[11px] text-zinc-500">Koute a toujou gratis. Acha a ba w fichye a pou w telechaje l epi kenbe l.</p>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
