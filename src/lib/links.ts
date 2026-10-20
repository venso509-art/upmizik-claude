// Netwaye yon lyen itilizatè a tape: ajoute https:// si l manke, refize sa ki pa yon lyen.
// Retounen null si chan an vid, oswa undefined si lyen an pa valid.
export function normalizeUrl(raw: string): string | null | undefined {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value.replace(/^http:\/\//i, "https://") : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".") || withProtocol.length > 300) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
