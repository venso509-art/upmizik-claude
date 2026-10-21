import * as tus from "tus-js-client";
import { supabaseEnv } from "@/lib/supabase/env";

// Kalite fichye bucket yo aksepte (menm lis ak migration SQL la).
// Nou deside kalite a dapre ekstansyon an, paske chak navigatè bay non diferan
// (pa egzanp "audio/x-flac" oswa "audio/mp3") ke Supabase t ap refize.
export const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
};
export const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

// Upload "resumable": fichye a ale an moso 6 MB. Si koneksyon an koupe,
// li reeseye otomatikman epi kontinye kote l te rive.
// Retounen chemen fichye a nan bucket la.
export function uploadResumable({
  bucket,
  path,
  file,
  contentType,
  accessToken,
  onProgress,
}: {
  bucket: string;
  path: string;
  file: File;
  contentType: string;
  accessToken: string;
  onProgress: (fraction: number) => void;
}) {
  return new Promise<string>((resolve, reject) => {
    let finalPath = path;
    const { url, key } = supabaseEnv();
    const upload = new tus.Upload(file, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: key,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType, cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024, // Supabase egzije egzakteman 6 MB
      onProgress: (sent, total) => onProgress(sent / total),
      onSuccess: () => resolve(finalPath),
      onError: (error) => reject(error),
    });

    // Si yon upload menm fichye a nan menm folder la te koupe anvan,
    // kontinye li olye rekòmanse (epi kenbe ansyen chemen an).
    const folder = path.split("/")[0] + "/";
    upload.findPreviousUploads().then((previous) => {
      const match = previous.find(
        (p) => p.metadata.bucketName === bucket && p.metadata.objectName?.startsWith(folder),
      );
      if (match) {
        finalPath = match.metadata.objectName;
        upload.options.metadata = { ...upload.options.metadata, objectName: finalPath };
        upload.resumeFromPreviousUpload(match);
      }
      upload.start();
    });
  });
}

// Li dire yon fichye odyo (an segonn) dirèkteman nan navigatè a
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}
