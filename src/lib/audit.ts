// Tradui aksyon jounal la an Kreyòl, pou admin nan konprann sa k pase
type Details = Record<string, unknown>;

const STATUS: Record<string, string> = {
  pending: "an atant",
  approved: "apwouve",
  blocked: "bloke",
  verified: "apwouve",
  rejected: "rejte",
  paid: "peye",
};

const s = (v: unknown) => STATUS[String(v)] ?? String(v ?? "—");

export function describeAudit(action: string, d: Details): { icon: string; text: string } {
  const name = d.name ? `« ${d.name} »` : "";
  const title = d.title ? `« ${d.title} »` : "";
  const htg = d.amount_htg ? ` · ${Number(d.amount_htg).toLocaleString("fr-HT")} goud` : "";

  switch (action) {
    case "profile.status":
      return { icon: "👤", text: `Kont ${name}: ${s(d.from)} → ${s(d.to)}` };
    case "profile.admin":
      return { icon: "🛡️", text: d.to ? `Bay dwa admin a ${name}` : `Retire dwa admin ${name}` };
    case "profile.verified":
      return { icon: "✓", text: d.to ? `Verifye ${name}` : `Retire ✓ ${name}` };
    case "profile.role":
      return { icon: "🔁", text: `Wòl ${name}: ${s(d.from)} → ${s(d.to)}` };
    case "donations.verified":
      return { icon: "💝", text: `Apwouve yon don${htg}` };
    case "donations.rejected":
      return { icon: "💝", text: `Rejte yon don${htg}` };
    case "payouts.paid":
      return { icon: "💸", text: `Make yon retrè kòm peye${htg}` };
    case "payouts.rejected":
      return { icon: "💸", text: `Rejte yon retrè${htg}` };
    case "artist_registrations.verified":
      return { icon: "🎤", text: `Apwouve yon enskripsyon atis${htg}` };
    case "artist_registrations.rejected":
      return { icon: "🎤", text: `Rejte yon enskripsyon atis${htg}` };
    case "song.deleted":
      return { icon: "🗑️", text: `Efase chante ${title}` };
    case "top3.changed":
      return { icon: "🏆", text: "Chanje Top 3 la" };
    case "ads.insert":
      return { icon: "📢", text: `Ajoute piblisite ${title}` };
    case "ads.update":
      return { icon: "📢", text: `Modifye piblisite ${title}${d.is_active === false ? " (dezaktive)" : ""}` };
    case "ads.delete":
      return { icon: "📢", text: `Efase piblisite ${title}` };
    case "artist_promos.insert":
      return { icon: "🚀", text: `Ajoute RPA ${title}` };
    case "artist_promos.update":
      return { icon: "🚀", text: `Modifye RPA ${title}` };
    case "artist_promos.delete":
      return { icon: "🚀", text: `Efase RPA ${title}` };
    case "settings.updated": {
      // details: { champ: [ansyen, nouvo] } → montre sèlman sa ki chanje
      const labels: Record<string, string> = {
        htg_per_usd: "To",
        moncash_number: "MonCash",
        natcash_number: "NatCash",
        registration_fee_usd: "Frè enskripsyon $",
        min_donation_usd: "Don minimòm $",
        monthly_fee_usd: "Frè mansyèl $",
      };
      const changes = Object.entries(d)
        .filter(([, v]) => Array.isArray(v) && String(v[0]) !== String(v[1]))
        .map(([k, v]) => `${labels[k] ?? k}: ${(v as unknown[])[0]} → ${(v as unknown[])[1]}`);
      return { icon: "💳", text: `Chanje paramèt peman yo${changes.length ? ` (${changes.join(", ")})` : ""}` };
    }
    case "post.blocked":
      return { icon: "🚫", text: `Bloke yon pòs ${name}${d.excerpt ? `: « ${d.excerpt} »` : ""}` };
    case "post.active":
      return { icon: "✅", text: `Debloke yon pòs ${name}${d.excerpt ? `: « ${d.excerpt} »` : ""}` };
    case "post.deleted":
      return { icon: "🗞️", text: `Efase yon pòs ${name}${d.excerpt ? `: « ${d.excerpt} »` : ""}` };
    case "archive":
      return { icon: "🗄️", text: "Achive yon eleman" };
    case "restore":
      return { icon: "♻️", text: "Retabli yon eleman nan achiv" };
    default:
      return { icon: "•", text: action };
  }
}

// "Mozilla/5.0 (Linux; Android 13...) Chrome/120..." → "Chrome · Android"
export function describeUserAgent(ua: string | null) {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Lòt";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "?";
  return `${browser} · ${os}`;
}
