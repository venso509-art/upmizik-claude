"use client";

import { useState } from "react";
import { ImageCropper } from "@/components/media/ImageCropper";

// Ti bouton anba foto prèv peman an: rapwoche/koupe kwen yo pou montan an ak non an li byen
export function ProofCropButton({ file, onChange, disabled }: { file: File; onChange: (f: File) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="text-sm font-semibold text-citron-300 hover:text-citron-200 disabled:opacity-50"
      >
        ✂️ Koupe / santre prèv la
      </button>
      {open && (
        <ImageCropper
          file={file}
          options={{ aspect: "original", outputWidth: 1600, title: "✂️ Koupe prèv peman an" }}
          onCancel={() => setOpen(false)}
          onDone={(f) => {
            onChange(f);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
