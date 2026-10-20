import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDonation } from "@/components/admin/DonationReview";
import type { DonationMethod } from "@/lib/donations";

export type DonationStatus = "pending" | "verified" | "rejected";

type Row = {
  id: string;
  amount_usd: number;
  amount_htg: number;
  method: DonationMethod;
  donor_name: string | null;
  contact_type: "email" | "whatsapp";
  contact_value: string;
  message: string | null;
  proof_path: string;
  status: DonationStatus;
  thanked_at: string | null;
  created_at: string;
  artist: { display_name: string } | null;
  song: { title: string } | null;
};

// Chaje don yo pou admin nan, ak lyen tanporè (1 è) pou wè foto prèv yo (bucket la prive)
export async function loadAdminDonations(supabase: SupabaseClient, status: DonationStatus, limit = 100): Promise<AdminDonation[]> {
  const { data } = await supabase
    .from("donations")
    .select(
      "id, amount_usd, amount_htg, method, donor_name, contact_type, contact_value, message, proof_path, status, thanked_at, created_at, artist:profiles!donations_artist_id_fkey(display_name), song:songs(title)",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .limit(limit)
    .returns<Row[]>();

  const rows = data ?? [];
  const { data: signed } = rows.length
    ? await supabase.storage.from("donation-proofs").createSignedUrls(rows.map((r) => r.proof_path), 3600)
    : { data: [] };
  const proofUrls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((r) => ({
    id: r.id,
    amountUsd: Number(r.amount_usd),
    amountHtg: Number(r.amount_htg),
    method: r.method,
    donorName: r.donor_name,
    contactType: r.contact_type,
    contactValue: r.contact_value,
    message: r.message,
    status: r.status,
    thankedAt: r.thanked_at,
    createdAt: r.created_at,
    artistName: r.artist?.display_name ?? "Atis enkoni",
    songTitle: r.song?.title ?? null,
    proofUrl: proofUrls.get(r.proof_path) ?? null,
  }));
}

export async function countDonations(supabase: SupabaseClient, status: DonationStatus) {
  const { count } = await supabase.from("donations").select("id", { count: "exact", head: true }).eq("status", status);
  return count ?? 0;
}
