import Link from "next/link";

// Mesaj pou atis ki poko apwouve oswa ki bloke
export function AccountStatusNotice({ status }: { status: "pending" | "blocked" }) {
  if (status === "blocked") {
    return (
      <div className="flex gap-4 rounded-2xl border border-red-900/60 bg-red-950/40 p-5">
        <span className="text-3xl">🚫</span>
        <div>
          <p className="font-bold text-red-200">Kont ou bloke</p>
          <p className="mt-1 text-sm text-red-200/80">
            Ou pa ka pibliye mizik pou kounye a. Si w panse se yon erè, kontakte ekip UpMizik la.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-amber-800/60 bg-amber-950/40 p-5">
      <span className="text-3xl">⏳</span>
      <div>
        <p className="font-bold text-amber-200">Kont ou ap tann validasyon admin</p>
        <p className="mt-1 text-sm text-amber-200/80">
          Pou aktive kont atis ou, peye frè enskripsyon an epi voye prèv la. Lè ekip UpMizik la apwouve l, w ap ka pibliye
          mizik ou.
        </p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-amber-100 underline hover:text-white">
          Peye frè enskripsyon an sou dashboard ou →
        </Link>
      </div>
    </div>
  );
}
