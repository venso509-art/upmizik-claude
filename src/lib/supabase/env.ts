// Varyab Supabase yo, nan yon sèl kote.
// ⚠️ Next.js ranplase process.env.NEXT_PUBLIC_* PANDAN BUILD la (pou navigatè a tou),
// men sèlman lè non an ekri an antye konsa. Nan Coolify, yo dwe make kòm "Build Variable".
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function missingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

// Retounen URL ak kle a, oswa voye yon erè KLÈ ki di ki varyab ki manke
export function supabaseEnv(): { url: string; key: string } {
  const missing = missingSupabaseEnv();
  if (missing.length) {
    throw new Error(
      `Varyab anviwònman ki manke: ${missing.join(", ")}. ` +
        `Nan Coolify → Environment Variables, ajoute yo, koche "Build Variable", epi refè deploy la.`,
    );
  }
  return { url: SUPABASE_URL!, key: SUPABASE_KEY! };
}
