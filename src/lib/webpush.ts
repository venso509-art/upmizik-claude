import { createPrivateKey, createSign } from "node:crypto";

// ===== WEB PUSH (sèvè sèlman) =====
// Nou voye yon push SAN kontni (pa bezwen chifre l): service worker a resevwa l, epi l mande sit la
// dènye notifikasyon moun nan (/api/push/latest) pou l montre l. Sekirite a: siyati VAPID (ES256)
// fèt ak node:crypto, kidonk pa gen pakè pou enstale. Kle yo nan Coolify: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.

export function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// Tikè VAPID (JWT ES256) pou sèvis push la (Google, Apple, Mozilla...)
function vapidJwt(audience: string, cfg: { publicKey: string; privateKey: string }) {
  const pub = Buffer.from(cfg.publicKey, "base64url"); // 65 byte: 0x04 | x | y
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: cfg.privateKey, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: "jwk",
  });
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64url(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:upmizikcontact@gmail.com" }));
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  const sig = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${b64url(sig)}`;
}

// Voye yon push vid bay yon telefòn. Retounen "gone" si telefòn nan pa aksepte push ankò (pou n efase l).
export async function sendEmptyPush(endpoint: string): Promise<"ok" | "gone" | "error"> {
  const cfg = vapidConfig();
  if (!cfg) return "error";
  let audience: string;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return "gone";
    audience = u.origin;
  } catch {
    return "gone";
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        TTL: String(24 * 3600),
        Urgency: "high",
        Authorization: `vapid t=${vapidJwt(audience, cfg)}, k=${cfg.publicKey}`,
        "Content-Length": "0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
