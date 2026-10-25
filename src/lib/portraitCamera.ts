// ===== Kamera POTRÈ (9:16) pou live yo =====
// Kamera telefòn yo konte dimansyon yo tankou telefòn nan KOUCHE (sansè a laj).
// 1) Nou mande 1920×1080 (16:9) SAN koupe: lè telefòn nan kanpe, li vire imaj la epi l bay 1080×1920 (9:16).
// 2) Nou gade imaj ki rive VRE a: si l kanpe, nou voye l jan l ye. Sèlman si l toujou laj
//    (webcam òdinatè), nou koupe mitan an an 9:16 ak yon canvas.

export type PortraitCamera = { track: MediaStreamTrack; stop: () => void; cropped: boolean };

const TARGET = 9 / 16;

export async function openPortraitCamera(facingMode: "user" | "environment"): Promise<PortraitCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
      // Pa kite navigatè a koupe imaj la (sa te bay yon gwo zoom)
      ...({ resizeMode: "none" } as Record<string, string>),
    },
  });
  const raw = stream.getVideoTracks()[0];
  // Kèk telefòn kòmanse ak yon ti zoom: mete l sou pi laj la (1x oswa grann-ang)
  try {
    const caps = raw.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number } };
    if (caps?.zoom) await raw.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] });
  } catch {
    // pa grav: kamera a rete jan l ye
  }
  const s = raw.getSettings();

  // Nou mezire imaj ki rive vre a (getSettings ka bay dimansyon sansè a "kouche" sou kèk telefòn)
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([raw]);
  await video.play().catch(() => {});
  await new Promise<void>((resolve) => (video.videoWidth ? resolve() : (video.onloadedmetadata = () => resolve())));
  const vw = video.videoWidth || s.width || 0;
  const vh = video.videoHeight || s.height || 0;

  // Kanpe (potrè): nou voye l jan l ye, san koupe, san zoom
  if (vh > 0 && vw <= vh) {
    video.pause();
    video.srcObject = null;
    return { track: raw, stop: () => raw.stop(), cropped: false };
  }

  // Imaj laj: koupe mitan an an 9:16
  const srcW = Math.round(vh * TARGET); // lajè moso mitan an
  const srcX = Math.round((vw - srcW) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = srcW - (srcW % 2); // pa agrandi: menm kantite piksèl ak moso a
  canvas.height = vh - (vh % 2);
  const ctx = canvas.getContext("2d", { alpha: false })!;

  let running = true;
  const draw = () => {
    if (!running) return;
    ctx.drawImage(video, srcX, 0, srcW, vh, 0, 0, canvas.width, canvas.height);
  };
  // requestVideoFrameCallback = chak nouvo imaj kamera a; sinon 30 fwa pa segonn
  type RVFC = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
  const v = video as RVFC;
  let timer: ReturnType<typeof setInterval> | null = null;
  if (v.requestVideoFrameCallback) {
    const loop = () => {
      draw();
      if (running) v.requestVideoFrameCallback!(loop);
    };
    v.requestVideoFrameCallback(loop);
  } else {
    timer = setInterval(draw, 1000 / 30);
  }

  const out = canvas.captureStream(30).getVideoTracks()[0];
  return {
    track: out,
    cropped: true,
    stop: () => {
      running = false;
      if (timer) clearInterval(timer);
      out.stop();
      raw.stop();
      video.srcObject = null;
    },
  };
}
