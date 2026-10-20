import type { Metadata } from "next";
import { OfflineLibrary } from "@/components/offline/OfflineLibrary";

export const metadata: Metadata = { title: "Mizik offline | UpMizik" };

// Paj sa a pa chaje anyen sou sèvè a: tout mizik yo soti nan memwa telefòn nan,
// konsa li mache menm san entènèt (Service Worker la sove l).
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">📥 Mizik offline</h1>
      <p className="mt-1 text-zinc-400">Mizik ou sove sou aparèy sa a. Ou ka koute yo menm lè w pa gen entènèt.</p>
      <div className="mt-8">
        <OfflineLibrary />
      </div>
    </div>
  );
}
