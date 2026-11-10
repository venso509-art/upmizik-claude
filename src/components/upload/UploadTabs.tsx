"use client";

import { useState } from "react";
import { UploadForm } from "@/components/upload/UploadForm";
import { ProjectUploadForm } from "@/components/upload/ProjectUploadForm";

// /upload: yon chante pou kont li, oswa yon pwojè konplè (Album, EP, Mixtape, Demo) yon sèl kou
export function UploadTabs({ userId, pro, initial }: { userId: string; pro: boolean; initial: "single" | "project" }) {
  const [mode, setMode] = useState(initial);
  const tab = (m: typeof mode, icon: string, title: string, hint: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-xl px-3 py-2.5 text-left transition ${mode === m ? "bg-citron-400/15 ring-1 ring-citron-400" : "hover:bg-white/5"}`}
    >
      <span className="block text-sm font-bold text-white">
        {icon} {title}
      </span>
      <span className="block text-[11px] text-zinc-500">{hint}</span>
    </button>
  );
  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5">
        {tab("single", "🎵", "Yon chante", "Single, oswa ajoute nan yon pwojè")}
        {tab("project", "💿", "Pwojè konplè", "Album, EP, Mixtape, Demo")}
      </div>
      {mode === "single" ? <UploadForm userId={userId} pro={pro} /> : <ProjectUploadForm userId={userId} pro={pro} />}
    </div>
  );
}
