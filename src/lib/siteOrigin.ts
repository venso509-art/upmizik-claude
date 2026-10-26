import type { NextRequest } from "next/server";

// Vrè adrès sit la (egz: https://upmizik.com). Dèyè Coolify (proxy), request.url se "localhost:3000":
// nou pran domèn nan nan header proxy a voye yo (x-forwarded-host / host).
export function siteOrigin(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host).split(",")[0].trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  // Sekirite: sèlman domèn UpMizik la (oswa localhost pou tès), pou pèsonn pa ka voye yon fo domèn nan header yo
  const name = host.replace(/:\d+$/, "").toLowerCase();
  const ok = /^[a-z0-9.-]+(:\d+)?$/i.test(host) && (name === "upmizik.com" || name.endsWith(".upmizik.com") || name === "localhost" || name === "127.0.0.1");
  if (!ok) return "https://upmizik.com";
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
