"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormState } from "react-dom";
import { updateProfile } from "@/app/pwofil/actions";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, fileExtension } from "@/lib/upload";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

export type EditableProfile = {
  id: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  influences: string | null;
  vision: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  donation_url: string | null;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {hint && <p className="text-sm text-zinc-500">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function TextArea({ name, defaultValue, max, rows, placeholder }: { name: string; defaultValue: string | null; max: number; rows: number; placeholder: string }) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);
  return (
    <div>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => setLength(e.target.value.length)}
        className={`${inputClass} resize-y`}
      />
      <p className="mt-1 text-right text-xs text-zinc-500">
        {length}/{max}
      </p>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: EditableProfile }) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateProfile, undefined);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();
  const isArtist = profile.role === "artist";

  async function changeAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(undefined);
    const ext = fileExtension(file);
    if (!IMAGE_TYPES[ext]) return setAvatarError("Itilize yon imaj JPG, PNG oswa WebP.");
    if (file.size > MAX_AVATAR_BYTES) return setAvatarError("Foto a twò gwo. Maksimòm: 2 MB.");

    setAvatarBusy(true);
    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: IMAGE_TYPES[ext], upsert: false });

    if (uploadError) {
      setAvatarBusy(false);
      return setAvatarError(`Foto a pa monte: ${uploadError.message}`);
    }

    const newUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", profile.id);
    if (updateError) {
      await supabase.storage.from("avatars").remove([path]);
      setAvatarBusy(false);
      return setAvatarError(`Foto a pa sove: ${updateError.message}`);
    }

    // Efase ansyen foto a pou l pa pran plas
    const oldPath = avatarUrl?.split("/avatars/")[1];
    if (oldPath) await supabase.storage.from("avatars").remove([decodeURIComponent(oldPath)]);

    setAvatarUrl(newUrl);
    setAvatarBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ===== FOTO ===== */}
      <Section title="Foto pwofil">
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Foto pwofil" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl font-extrabold text-white">
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <label className={`inline-block cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white ${avatarBusy ? "pointer-events-none opacity-60" : ""}`}>
              {avatarBusy ? "Ap monte..." : "📷 Chanje foto"}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => changeAvatar(e.target.files?.[0])} />
            </label>
            <p className="mt-2 text-xs text-zinc-500">JPG, PNG oswa WebP · Maks 2 MB</p>
          </div>
        </div>
        <FormMessage error={avatarError} />
      </Section>

      <form action={formAction} className="space-y-6">
        {/* ===== ENFÒMASYON ===== */}
        <Section title="Enfòmasyon">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isArtist ? "Non atis" : "Non"}>
              <input name="display_name" defaultValue={profile.display_name} required maxLength={80} className={inputClass} />
            </Field>
            <Field label="Kote w ye">
              <input name="location" defaultValue={profile.location ?? ""} maxLength={100} placeholder="Egz: Pòtoprens, Ayiti" className={inputClass} />
            </Field>
          </div>
          <Field label={isArtist ? "Biyografi" : "Kèk mo sou ou"}>
            <TextArea
              name="bio"
              defaultValue={profile.bio}
              max={1000}
              rows={5}
              placeholder={isArtist ? "Rakonte istwa w: kote w soti, kijan w kòmanse fè mizik..." : "Ki mizik ou renmen?"}
            />
          </Field>
        </Section>

        {isArtist && (
          <>
            {/* ===== MIZIK MWEN ===== */}
            <Section title="Mizik mwen" hint="Ede fanatik ou yo konprann kiyès ou ye kòm atis.">
              <Field label="🌟 Atis ki enspire m">
                <TextArea
                  name="influences"
                  defaultValue={profile.influences}
                  max={500}
                  rows={3}
                  placeholder="Egz: Boukman Eksperyans, Tabou Combo, Wyclef Jean..."
                />
              </Field>
              <Field label="🎯 Vizyon mwen pou mizik">
                <TextArea
                  name="vision"
                  defaultValue={profile.vision}
                  max={1000}
                  rows={4}
                  placeholder="Kisa w vle mizik ou pote bay moun? Ki rèv ou genyen?"
                />
              </Field>
            </Section>

            {/* ===== LYEN ===== */}
            <Section title="Lyen" hint="Lyen sa yo ap parèt sou paj atis ou ak sou kat chante ou yo.">
              <Field label="▶ Chanèl YouTube">
                <input name="youtube_url" defaultValue={profile.youtube_url ?? ""} placeholder="youtube.com/@non-ou" className={inputClass} />
              </Field>
              <Field label="📸 Instagram">
                <input name="instagram_url" defaultValue={profile.instagram_url ?? ""} placeholder="instagram.com/non-ou" className={inputClass} />
              </Field>
              <Field label="💝 Lyen pou resevwa don">
                <input name="donation_url" defaultValue={profile.donation_url ?? ""} placeholder="paypal.me/non-ou, cash.app/$non-ou..." className={inputClass} />
              </Field>
              <p className="text-xs text-zinc-500">
                Si w mete yon lyen don, yon bouton 💝 ap parèt sou chante ou yo pou fanatik ou yo ka sipòte w.
              </p>
            </Section>
          </>
        )}

        <FormMessage error={state?.error} message={state?.message} />
        <SubmitButton>Sove pwofil la</SubmitButton>
      </form>
    </div>
  );
}
