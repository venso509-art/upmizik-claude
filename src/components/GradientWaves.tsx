"use client";

import { useEffect, useRef, useState } from "react";

// ===== GradientWaves: vag degradasyon k ap bouje dousman (WebGL) =====
// - waveColor: 4 koulè degradasyon an (anba → anlè)
// - amplitude: wotè vag yo (0 → 1) · swell: gwo ondilasyon dousman (0 → 1)
// - lightAngle: direksyon limyè a (degre) pou ti relyèf la · speed: vitès (1 = nòmal)
// Lejè pou telefòn: rezolisyon redwi, maks 30 imaj/segonn, kanpe lè l pa vizib oswa onglè a kache.
// San WebGL (oswa "mwens animasyon"): yon degradasyon CSS fiks nan menm koulè yo.

type Props = {
  waveColor?: string[];
  amplitude?: number;
  swell?: number;
  lightAngle?: number;
  speed?: number;
  className?: string;
};

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_amp;
uniform float u_swell;
uniform vec2 u_light;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

// Wotè "lanmè" a nan yon pwen: plizyè vag ki kwaze, ak yon gwo ondilasyon (swell)
float height(vec2 uv, float t) {
  float h = sin(uv.x * 3.1 + t * 0.9 + uv.y * 1.3) * 0.55;
  h += sin(uv.x * 5.7 - t * 0.7 + uv.y * 2.4) * 0.30;
  h += sin(uv.x * 9.3 + t * 1.3 - uv.y * 3.1) * 0.15;
  h *= u_amp;
  h += u_swell * 0.45 * sin(uv.y * 2.2 - t * 0.35 + sin(uv.x * 1.4 + t * 0.2));
  return h;
}

// Degradasyon 4 koulè yo: 3 premye yo pataje espas la, dènye a (aksan, egz: jòn) sèlman sou tèt vag yo
vec3 palette(float v) {
  v = clamp(v, 0.0, 1.2);
  vec3 c = mix(u_c0, u_c1, smoothstep(0.0, 0.38, v));
  c = mix(c, u_c2, smoothstep(0.38, 0.78, v));
  return mix(c, u_c3, smoothstep(0.86, 1.08, v) * 0.85);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.x *= u_res.x / max(u_res.y, 1.0) * 0.6;
  float t = u_time;
  float h = height(uv, t);

  // Pozisyon nan degradasyon an: wotè ekran an + vag yo (bann ki ondile)
  float band = gl_FragCoord.y / u_res.y * 0.85 + 0.13 + h * 0.6 + 0.08 * sin(uv.x * 2.0 + t * 0.25);
  vec3 col = palette(band);

  // Ti relyèf: nòmal la soti nan pant vag yo, limyè a soti nan lightAngle
  float e = 0.004;
  float dx = height(uv + vec2(e, 0.0), t) - h;
  float dy = height(uv + vec2(0.0, e), t) - h;
  vec3 n = normalize(vec3(-dx / e * 0.12, -dy / e * 0.12, 1.0));
  vec3 l = normalize(vec3(u_light, 0.75));
  float diff = dot(n, l);
  col *= 0.72 + 0.45 * diff;
  // Ti reflè limyè (pi klere sou jòn nan)
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
  col += spec * 0.18 * (0.4 + u_c3);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function GradientWaves({
  waveColor = ["#0A5C36", "#0B132B", "#1E3A8A", "#FFD700"],
  amplitude = 0.3,
  swell = 0.6,
  lightAngle = 45,
  speed = 0.5,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const colors = [0, 1, 2, 3].map((i) => waveColor[i] ?? waveColor[waveColor.length - 1] ?? "#0B132B");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    // Yon gwo triyang ki kouvri tout ekran an
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("u_res");
    const uTime = u("u_time");
    gl.uniform1f(u("u_amp"), amplitude);
    gl.uniform1f(u("u_swell"), swell);
    const a = (lightAngle * Math.PI) / 180;
    gl.uniform2f(u("u_light"), Math.cos(a), Math.sin(a));
    colors.forEach((c, i) => gl.uniform3f(u(`u_c${i}`), ...hexToRgb(c)));

    // Rezolisyon redwi (lejè pou telefòn yo); CSS la agrandi l, vag yo dous kanmenm
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.6;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    let last = 0;
    let visible = true;
    const start = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible || document.hidden || now - last < 33) return; // maks ~30 imaj/segonn
      last = now;
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      gl.uniform1f(uTime, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); // yon sèl imaj fiks
    } else {
      raf = requestAnimationFrame(draw);
    }

    // Kanpe lè hero a pa sou ekran an
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amplitude, swell, lightAngle, speed, colors.join(",")]);

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      {/* data-gl: pou tès (canvas WebGL oswa degradasyon fiks) */}
      {fallback ? (
        <div className="h-full w-full" style={{ background: `linear-gradient(${lightAngle + 90}deg, ${colors.join(", ")})` }} />
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}

export default GradientWaves;
