"use client";

import { useEffect, useState } from "react";

// Mòd light / dark. Chwa a sere sou aparèy la; script tèt paj la (THEME_HEAD_SCRIPT) aplike l
// ANVAN paj la parèt, konsa pa gen flash koulè.
const KEY = "upmizik-theme";
export const THEME_HEAD_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="light"){document.documentElement.classList.add("light")}}catch(e){}`;

function setThemeColor(light: boolean) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#FFFFFF" : "#0B132B");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const on = document.documentElement.classList.contains("light");
    setLight(on);
    setThemeColor(on);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    setThemeColor(next);
    try {
      localStorage.setItem(KEY, next ? "light" : "dark");
    } catch {
      // navigatè prive: chwa a pa sere, men li aplike kanmenm
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Telefòn: ti bouton won (pa gen plas); òdinatè: switch ki glise
      className={`relative flex h-9 w-9 shrink-0 items-center rounded-full border border-white/15 bg-white/5 p-[3px] transition hover:border-white/30 sm:w-16 sm:p-1 ${className}`}
      aria-label={light ? "Aktive mòd sonb (dark)" : "Aktive mòd klè (light)"}
      aria-pressed={light}
      title={light ? "Mòd sonb" : "Mòd klè"}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm shadow-md transition-transform duration-300 ${
          light ? "bg-citron-400 sm:translate-x-7" : "translate-x-0 bg-zinc-800"
        }`}
      >
        {light ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
