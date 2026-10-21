"use client";

// Paj erè lè menm layout la kraze (egz: header a pa ka konekte ak Supabase).
// Li ranplase TOUT paj la, kidonk li bezwen pwòp <html>/<body> li, ak stil "inline"
// (fichye CSS sit la pa chaje nan ka sa a).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ht">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0B132B", color: "#e4e4e7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 56, margin: 0 }}>😵</p>
          <h1 style={{ fontSize: 24, color: "#fff", margin: "16px 0 8px" }}>UpMizik rankontre yon erè</h1>
          <p style={{ color: "#a1a1aa", margin: 0 }}>Sit la pa ka chaje kounye a. Eseye ankò nan kèk segonn.</p>

          <div
            style={{
              marginTop: 24,
              padding: 16,
              border: "1px solid #1C2642",
              borderRadius: 12,
              background: "#121B37",
              textAlign: "left",
              fontSize: 12,
              color: "#a1a1aa",
            }}
          >
            <p style={{ margin: 0, fontFamily: "monospace", color: "#fca5a5", wordBreak: "break-word" }}>{error.message || "Erè enkoni"}</p>
            {error.digest && <p style={{ margin: "8px 0 0", fontFamily: "monospace" }}>Kòd erè (digest): {error.digest}</p>}
            <p style={{ margin: "8px 0 0" }}>
              Admin: louvri{" "}
              <a href="/sante" style={{ color: "#FFD700" }}>
                /sante
              </a>{" "}
              pou dyagnostik.
            </p>
          </div>

          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              border: 0,
              borderRadius: 999,
              background: "#FFD700",
              color: "#0B132B",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Eseye ankò
          </button>
        </div>
      </body>
    </html>
  );
}
