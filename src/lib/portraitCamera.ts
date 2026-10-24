// ===== Kamera POTRÈ (9:16) pou live yo =====
// Pifò kamera telefòn ak òdinatè voye yon imaj laj (16:9) menm lè telefòn nan kanpe.
// 1) Nou mande kamera a 9:16 dirèkteman (anpil navigatè koupe l pou nou).
// 2) Si imaj la toujou laj, nou koupe MITAN an an 9:16 ak yon canvas, epi se sa nou voye bay fanatik yo.

export type PortraitCamera = { track: MediaStreamTrack; stop: () => void; cropped: boolean };

const TARGET = 9 / 16;

export async function openPortraitCamera(facingMode: "user" | "environment"): Promise<PortraitCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode,
      width: { ideal: 1080 },
      height: { ideal: 1920 },
      aspectRatio: { ideal: TARGET },
      frameRate: { ideal: 30, max: 30 },
      // Chrome/Android: koupe imaj la nan bon fòma a dirèkteman nan kamera a
      ...({ resizeMode: "crop-and-scale" } as Record<string, string>),
    },
  });
  const raw = stream.getVideoTracks()[0];
  const s = raw.getSettings();
  const w = s.width ?? 0;
  const h = s.height ?? 0;

  // Deja potrè (oswa prèske): pa gen anyen pou fè
  if (h > 0 && w / h <= TARGET + 0.05) return { track: raw, stop: () => raw.stop(), cropped: false };

  // Imaj laj: koupe mitan an an 9:16
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([raw]);
  await video.play().catch(() => {});
  await new Promise<void>((resolve) => (video.videoWidth ? resolve() : (video.onloadedmetadata = () => resolve())));

  const vw = video.videoWidth || w;
  const vh = video.videoHeight || h;
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
