import { createHmac } from "node:crypto";

// ===== LiveKit (videyo live yo) =====
// Kle yo nan varyab anviwònman sèvè a (Coolify): LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
// Sekrè a pa janm kite sèvè a: nou siyen "tikè" (JWT) yo isit la, epi navigatè a resevwa tikè a sèlman.

export function livekitConfig() {
  // LIVEKIT_URL (oswa NEXT_PUBLIC_LIVEKIT_URL: adrès wss la pa yon sekrè)
  const url = (process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL)?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// Tikè pou antre nan yon chanm live. canPublish = moun nan ka voye videyo/son (atis la oswa yon envite aksepte).
export function liveToken(opts: {
  apiKey: string;
  apiSecret: string;
  room: string;
  identity: string;
  name: string;
  canPublish: boolean;
  ttlSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    name: opts.name,
    nbf: now - 10,
    exp: now + (opts.ttlSeconds ?? 6 * 3600),
    video: {
      room: opts.room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: opts.canPublish,
      canPublishData: true,
    },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = b64url(createHmac("sha256", opts.apiSecret).update(unsigned).digest());
  return `${unsigned}.${signature}`;
}

// Non chanm LiveKit la pou yon live
export const liveRoomName = (liveId: string) => `upmizik-live-${liveId}`;
