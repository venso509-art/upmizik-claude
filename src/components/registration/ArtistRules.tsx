"use client";

import { formatHTG, formatUSD } from "@/lib/donations";
import { useSettings } from "@/components/SettingsProvider";
import { ARTIST_SHARE_PERCENT, MIN_PAYOUT_HTG, PAYOUT_WAIT_MONTHS, PLATFORM_FEE_PERCENT } from "@/lib/finance";
import { DONATION_LEVELS, PLAQUE_MIN_DONATIONS_USD, PLAY_LEVELS, formatPlays } from "@/lib/levels";

function Block({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="font-semibold text-white">
        {icon} {title}
      </p>
      <div className="mt-2 space-y-1.5 text-sm text-zinc-300">{children}</div>
    </div>
  );
}

// Tout sa yon atis dwe konnen anvan l enskri: lajan, don, frè, nivo, plak
export function ArtistRules() {
  const settings = useSettings();
  return (
    <div className="space-y-3">
      <Block icon="💰" title="Kijan ou touche">
        <p>
          Fanatik ou yo voye ou <span className="font-semibold text-white">don</span> sou MonCash oswa NatCash, dirèkteman sou chante ou yo
          oswa sou paj atis ou.
        </p>
        <p>
          Sou chak don: <span className="font-semibold text-white">{ARTIST_SHARE_PERCENT}%</span> pou ou (ak moun ou bay royalties yo),{" "}
          <span className="font-semibold text-white">{PLATFORM_FEE_PERCENT}%</span> pou UpMizik.
        </p>
        <p>🤝 Ou ka bay royalties bay jiska 5 moun ki te travay sou yon chante. UpMizik peye yo dirèkteman.</p>
      </Block>

      <Block icon="📅" title="Frè ak retrè">
        <p>
          Chak mwa ou touche: {formatUSD(settings.monthlyFeeUsd)} frè platfòm. Mwa ou pa touche anyen, ou pa peye anyen.
        </p>
        <p>Lajan yon mwa vin disponib depi mwa a fini.</p>
        <p>
          Premye retrè: {PAYOUT_WAIT_MONTHS} mwa apre kont ou apwouve. Apre sa, nenpòt ki lè (minimòm {formatHTG(MIN_PAYOUT_HTG)}), sou
          MonCash oswa NatCash, ak PIN ou.
        </p>
      </Block>

      <Block icon="🏅" title="Nivo ak plak">
        <p className="text-zinc-400">Dapre don ou resevwa:</p>
        <p>{DONATION_LEVELS.map((l) => `${l.emoji} ${l.name}${l.threshold ? ` ($${l.threshold})` : ""}`).join(" · ")}</p>
        <p className="pt-1 text-zinc-400">Dapre ekout mizik ou:</p>
        <p>
          {PLAY_LEVELS.filter((l) => l.threshold > 0)
            .map((l) => `${l.emoji} ${l.name} (${formatPlays(l.threshold)})`)
            .join(" · ")}
        </p>
        <p className="pt-1">
          🏆 Plak fizik UpMizik pou {PLAY_LEVELS.filter((l) => l.plaque).map((l) => formatPlays(l.threshold)).join(", ")} ekout, si w gen omwen $
          {PLAQUE_MIN_DONATIONS_USD} don. ✓ Badj verifye a bay pa ekip la.
        </p>
      </Block>

      <p className="text-center text-xs text-zinc-500">To: 1 $ = {settings.htgPerUsd} goud</p>
    </div>
  );
}
