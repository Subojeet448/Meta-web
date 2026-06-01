import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// ─── Theme Definitions ──────────────────────────────────────────────────────
const THEMES = {
  dark: {
    name: "Dark",
    bg: "#0a0a0f",
    surface: "#13131a",
    card: "#1a1a26",
    border: "#2a2a3d",
    accent: "#7c5cfc",
    accentHover: "#6a4de8",
    accentGlow: "rgba(124,92,252,0.35)",
    text: "#f0f0ff",
    textMuted: "#8888aa",
    textDim: "#55556a",
    gradient: "linear-gradient(135deg, #7c5cfc 0%, #c45cfc 100%)",
    gradientBg: "radial-gradient(ellipse at 20% 20%, rgba(124,92,252,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(196,92,252,0.1) 0%, transparent 60%)",
    success: "#4cfc9a",
    danger: "#fc5c7d",
    warning: "#fcbf5c",
  },
  light: {
    name: "Light",
    bg: "#f5f5ff",
    surface: "#ffffff",
    card: "#eeeeff",
    border: "#d5d5ee",
    accent: "#6248e8",
    accentHover: "#513ed4",
    accentGlow: "rgba(98,72,232,0.2)",
    text: "#1a1a2e",
    textMuted: "#555577",
    textDim: "#9999bb",
    gradient: "linear-gradient(135deg, #6248e8 0%, #a048e8 100%)",
    gradientBg: "radial-gradient(ellipse at 20% 20%, rgba(98,72,232,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(160,72,232,0.06) 0%, transparent 60%)",
    success: "#1eb870",
    danger: "#e83535",
    warning: "#e87c1e",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useLocalStorage(key, defaultVal) {
  const [state, setState] = useState(defaultVal);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) setState(JSON.parse(val));
    } catch {}
    setLoaded(true);
  }, [key]);

  const setAndStore = useCallback(
    (val) => {
      setState(val);
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    },
    [key]
  );

  return [state, setAndStore, loaded];
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function PlatformBadge({ platform, t }) {
  const icons = { facebook: "𝑓", instagram: "▣", twitter: "✕", tiktok: "♪" };
  const icon = icons[platform?.toLowerCase()] || "▶";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: t.accent,
        color: "#fff",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {icon} {platform || "Video"}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [themeKey, setThemeKey, themeLoaded] = useLocalStorage("theme", "dark");
  const [customBg, setCustomBg, bgLoaded] = useLocalStorage("customBg", null);
  const [history, setHistory, histLoaded] = useLocalStorage("history", []);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dlProgress, setDlProgress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);

  const inputRef = useRef(null);
  const bgFileRef = useRef(null);

  const t = THEMES[themeKey] || THEMES.dark;

  // ─── Fetch Video ───────────────────────────────────────────────────────────
  const fetchVideo = async (e) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please paste a Meta / Facebook / Instagram video URL.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/meta-video?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch video");
      setResult(data);
      // Save to history
      const entry = {
        id: Date.now(),
        url: trimmed,
        title: data.title || "Untitled",
        thumbnail: data.thumbnail,
        platform: data.platform,
        videoUrl: data.video,
        fetchedAt: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev.slice(0, 19)]);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────
  const downloadVideo = async (videoUrl, filename = "video.mp4") => {
    if (!videoUrl) return;
    setDlProgress(0);
    try {
      const res = await fetch(videoUrl);
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setDlProgress(Math.round((received / total) * 100));
      }
      const blob = new Blob(chunks, { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct link
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = filename;
      a.target = "_blank";
      a.click();
    } finally {
      setTimeout(() => setDlProgress(null), 1500);
    }
  };

  // ─── Copy URL ──────────────────────────────────────────────────────────────
  const copyUrl = (u) => {
    navigator.clipboard.writeText(u).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // ─── Custom BG Image ──────────────────────────────────────────────────────
  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomBg(ev.target.result);
      setBgUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeBg = () => setCustomBg(null);

  // ─── Paste Helper ─────────────────────────────────────────────────────────
  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      setUrl(text);
      inputRef.current?.focus();
    });
  };

  if (!themeLoaded || !bgLoaded || !histLoaded) return null;

  // ─── Styles ───────────────────────────────────────────────────────────────
  const S = {
    root: {
      minHeight: "100vh",
      background: customBg
        ? `url(${customBg}) center/cover fixed`
        : t.bg,
      color: t.text,
      fontFamily: "'Sora', 'DM Sans', sans-serif",
      transition: "background 0.4s, color 0.3s",
    },
    overlay: {
      minHeight: "100vh",
      background: customBg
        ? "rgba(0,0,0,0.55)"
        : t.gradientBg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "0 16px 60px",
    },
    topBar: {
      width: "100%",
      maxWidth: 720,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 0 0",
    },
    logoWrap: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    logoIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: t.gradient,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      boxShadow: `0 4px 20px ${t.accentGlow}`,
    },
    logoText: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: -0.5,
      background: t.gradient,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    iconBtn: {
      background: t.surface,
      border: `1px solid ${t.border}`,
      color: t.text,
      borderRadius: 10,
      width: 38,
      height: 38,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 16,
      transition: "all 0.2s",
    },
    heroSection: {
      width: "100%",
      maxWidth: 720,
      marginTop: 40,
      textAlign: "center",
    },
    heroTitle: {
      fontSize: "clamp(28px, 6vw, 44px)",
      fontWeight: 800,
      letterSpacing: -1,
      lineHeight: 1.15,
      marginBottom: 10,
    },
    heroSub: {
      fontSize: 15,
      color: t.textMuted,
      marginBottom: 32,
    },
    card: {
      background: customBg ? "rgba(10,10,20,0.75)" : t.surface,
      backdropFilter: customBg ? "blur(20px)" : "none",
      border: `1px solid ${t.border}`,
      borderRadius: 20,
      padding: "28px 24px",
      width: "100%",
      maxWidth: 720,
      boxShadow: `0 8px 40px rgba(0,0,0,0.18)`,
    },
    inputRow: {
      display: "flex",
      gap: 8,
      width: "100%",
    },
    input: {
      flex: 1,
      background: t.card,
      border: `1.5px solid ${t.border}`,
      borderRadius: 12,
      color: t.text,
      fontSize: 15,
      padding: "13px 16px",
      outline: "none",
      transition: "border 0.2s",
      fontFamily: "inherit",
    },
    pasteBtn: {
      background: t.card,
      border: `1.5px solid ${t.border}`,
      color: t.textMuted,
      borderRadius: 12,
      padding: "0 14px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: "nowrap",
      fontFamily: "inherit",
      transition: "all 0.2s",
    },
    fetchBtn: {
      background: t.gradient,
      border: "none",
      color: "#fff",
      borderRadius: 12,
      padding: "0 22px",
      cursor: loading ? "not-allowed" : "pointer",
      fontSize: 15,
      fontWeight: 700,
      height: 48,
      boxShadow: `0 4px 20px ${t.accentGlow}`,
      transition: "opacity 0.2s, transform 0.15s",
      fontFamily: "inherit",
      opacity: loading ? 0.7 : 1,
    },
    errorBox: {
      marginTop: 14,
      background: `rgba(252,92,125,0.12)`,
      border: `1px solid ${t.danger}`,
      borderRadius: 10,
      padding: "10px 14px",
      color: t.danger,
      fontSize: 13,
    },
    resultCard: {
      marginTop: 20,
      background: customBg ? "rgba(10,10,20,0.8)" : t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      overflow: "hidden",
    },
    thumbRow: {
      position: "relative",
      width: "100%",
      aspectRatio: "16/9",
      background: "#000",
      overflow: "hidden",
    },
    thumb: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    videoPlayer: {
      width: "100%",
      maxHeight: 400,
      background: "#000",
      display: "block",
    },
    metaRow: {
      padding: "14px 16px 8px",
    },
    videoTitle: {
      fontSize: 15,
      fontWeight: 600,
      marginBottom: 8,
      lineHeight: 1.4,
    },
    dimText: {
      fontSize: 12,
      color: t.textDim,
      marginTop: 2,
    },
    actionRow: {
      display: "flex",
      gap: 8,
      padding: "10px 16px 16px",
      flexWrap: "wrap",
    },
    dlBtn: {
      flex: 1,
      minWidth: 120,
      background: t.gradient,
      border: "none",
      borderRadius: 10,
      color: "#fff",
      fontWeight: 700,
      fontSize: 14,
      padding: "11px 16px",
      cursor: "pointer",
      fontFamily: "inherit",
      boxShadow: `0 3px 15px ${t.accentGlow}`,
      transition: "transform 0.15s",
    },
    copyBtn: {
      background: t.surface,
      border: `1.5px solid ${t.border}`,
      color: t.text,
      borderRadius: 10,
      padding: "11px 16px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit",
      transition: "all 0.2s",
    },
    openBtn: {
      background: "transparent",
      border: `1.5px solid ${t.border}`,
      color: t.textMuted,
      borderRadius: 10,
      padding: "11px 14px",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
    },
    progressBar: {
      height: 4,
      background: t.border,
      borderRadius: 2,
      overflow: "hidden",
      margin: "0 16px 12px",
    },
    progressFill: {
      height: "100%",
      background: t.gradient,
      borderRadius: 2,
      transition: "width 0.3s",
    },
    // Settings panel
    settingsPanel: {
      position: "fixed",
      top: 0,
      right: 0,
      width: "min(320px, 92vw)",
      height: "100vh",
      background: customBg ? "rgba(10,10,20,0.92)" : t.surface,
      backdropFilter: "blur(20px)",
      borderLeft: `1px solid ${t.border}`,
      zIndex: 100,
      padding: "28px 22px",
      overflowY: "auto",
      transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
      boxShadow: "-8px 0 40px rgba(0,0,0,0.25)",
    },
    settingsTitle: {
      fontSize: 18,
      fontWeight: 800,
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    settingsLabel: {
      fontSize: 12,
      fontWeight: 700,
      color: t.textMuted,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 10,
      marginTop: 20,
    },
    themeRow: {
      display: "flex",
      gap: 8,
    },
    themeChip: (active) => ({
      flex: 1,
      padding: "9px 0",
      borderRadius: 10,
      border: active ? `2px solid ${t.accent}` : `1.5px solid ${t.border}`,
      background: active ? `${t.accentGlow}` : t.card,
      color: active ? t.accent : t.textMuted,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      textAlign: "center",
      fontFamily: "inherit",
      transition: "all 0.2s",
    }),
    bgPreview: {
      width: "100%",
      height: 80,
      borderRadius: 10,
      border: `1.5px solid ${t.border}`,
      overflow: "hidden",
      background: t.card,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      cursor: "pointer",
      position: "relative",
    },
    bgImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    smallBtn: {
      background: t.card,
      border: `1.5px solid ${t.border}`,
      borderRadius: 8,
      color: t.text,
      fontSize: 12,
      fontWeight: 600,
      padding: "6px 12px",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    dangerBtn: {
      background: "transparent",
      border: `1.5px solid ${t.danger}`,
      borderRadius: 8,
      color: t.danger,
      fontSize: 12,
      fontWeight: 600,
      padding: "6px 12px",
      cursor: "pointer",
      fontFamily: "inherit",
    },
    // History
    histItem: {
      display: "flex",
      gap: 10,
      padding: "10px 0",
      borderBottom: `1px solid ${t.border}`,
      cursor: "pointer",
      transition: "opacity 0.2s",
    },
    histThumb: {
      width: 54,
      height: 40,
      borderRadius: 6,
      objectFit: "cover",
      background: t.card,
      flexShrink: 0,
    },
    histMeta: {
      flex: 1,
      overflow: "hidden",
    },
    histTitle: {
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    histTime: {
      fontSize: 11,
      color: t.textDim,
      marginTop: 2,
    },
    loader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      color: t.textMuted,
      fontSize: 14,
      padding: "24px 0",
    },
  };

  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <>
      <Head>
        <title>MetaSaver — Download Meta Videos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Download videos from Facebook, Instagram and Meta platforms instantly." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { -webkit-tap-highlight-color: transparent; }
          input::placeholder { color: ${t.textDim}; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
          @keyframes fadeUp {
            from { opacity:0; transform: translateY(16px); }
            to   { opacity:1; transform: translateY(0); }
          }
          .fadeUp { animation: fadeUp 0.4s ease both; }
          .dlbtn:hover { transform: scale(1.02); }
          .iconbtn:hover { background: ${t.card} !important; }
        `}</style>
      </Head>

      <div style={S.root}>
        <div style={S.overlay}>

          {/* ── Top Bar ── */}
          <div style={S.topBar}>
            <div style={S.logoWrap}>
              <div style={S.logoIcon}>⬇</div>
              <span style={S.logoText}>MetaSaver</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="iconbtn"
                style={S.iconBtn}
                onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }}
                title="History"
              >🕐</button>
              <button
                className="iconbtn"
                style={S.iconBtn}
                onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }}
                title="Settings"
              >⚙️</button>
            </div>
          </div>

          {/* ── Hero ── */}
          <div style={S.heroSection} className="fadeUp">
            <h1 style={S.heroTitle}>
              Download{" "}
              <span style={{ background: t.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Meta Videos
              </span>
              <br />instantly & free
            </h1>
            <p style={S.heroSub}>Facebook · Instagram · Meta — paste any video URL and save it.</p>
          </div>

          {/* ── Main Card ── */}
          <div style={{ ...S.card, marginTop: 0 }} className="fadeUp">
            <form
              onSubmit={fetchVideo}
              style={{ display: "flex", flexDirection: "column", gap: 0 }}
            >
              <div style={S.inputRow}>
                <input
                  ref={inputRef}
                  style={S.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste Facebook / Instagram video URL…"
                  type="url"
                  autoComplete="off"
                  onFocus={(e) => (e.target.style.borderColor = t.accent)}
                  onBlur={(e) => (e.target.style.borderColor = t.border)}
                />
                <button type="button" style={S.pasteBtn} onClick={handlePaste}>Paste</button>
                <button type="submit" style={S.fetchBtn} className="dlbtn" disabled={loading}>
                  {loading ? "…" : "Get ↓"}
                </button>
              </div>
            </form>

            {/* Error */}
            {error && <div style={S.errorBox}>⚠ {error}</div>}

            {/* Loading */}
            {loading && (
              <div style={S.loader}>
                <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite", fontSize: 20 }}>⏳</span>
                Fetching video info…
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div style={S.resultCard} className="fadeUp">
                {/* Thumbnail or Video */}
                {result.video ? (
                  <video
                    style={S.videoPlayer}
                    controls
                    poster={result.thumbnail}
                    preload="metadata"
                    playsInline
                  >
                    <source src={result.video} type="video/mp4" />
                  </video>
                ) : result.thumbnail ? (
                  <div style={S.thumbRow}>
                    <img src={result.thumbnail} alt="thumbnail" style={S.thumb} />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)"
                    }} />
                    <div style={{
                      position: "absolute", bottom: 12, left: 14,
                      display: "flex", gap: 8, alignItems: "center"
                    }}>
                      <PlatformBadge platform={result.platform} t={t} />
                      {result.width && result.height && (
                        <span style={{ color: "#fff", fontSize: 12, opacity: 0.85 }}>
                          {result.width}×{result.height}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Meta */}
                <div style={S.metaRow}>
                  {result.title && <p style={S.videoTitle}>{result.title}</p>}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                    {result.platform && <PlatformBadge platform={result.platform} t={t} />}
                    {result.video_id && <span style={S.dimText}>ID: {result.video_id}</span>}
                  </div>
                </div>

                {/* Progress bar */}
                {dlProgress !== null && (
                  <div style={S.progressBar}>
                    <div style={{ ...S.progressFill, width: `${dlProgress}%` }} />
                  </div>
                )}

                {/* Actions */}
                <div style={S.actionRow}>
                  {result.video && (
                    <button
                      className="dlbtn"
                      style={S.dlBtn}
                      onClick={() =>
                        downloadVideo(
                          result.video,
                          `${result.title?.slice(0, 40) || "video"}.mp4`
                        )
                      }
                    >
                      {dlProgress !== null ? `${dlProgress}%  ⬇` : "⬇  Download MP4"}
                    </button>
                  )}
                  {result.thumbnail && (
                    <button
                      className="dlbtn"
                      style={{ ...S.dlBtn, background: t.card, color: t.text, boxShadow: "none" }}
                      onClick={() =>
                        downloadVideo(result.thumbnail, "thumbnail.jpg")
                      }
                    >
                      🖼 Thumbnail
                    </button>
                  )}
                  <button
                    style={S.copyBtn}
                    onClick={() => copyUrl(result.video || result.thumbnail)}
                  >
                    {copied ? "✓ Copied!" : "⎘ Copy URL"}
                  </button>
                  {result.video && (
                    <button
                      style={S.openBtn}
                      onClick={() => window.open(result.video, "_blank")}
                    >
                      ↗
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Features Row ── */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            maxWidth: 720, marginTop: 24, width: "100%"
          }}>
            {[
              ["⚡", "Instant", "No wait, no login"],
              ["🔒", "Safe", "No data stored"],
              ["📱", "Mobile", "Optimized for phone"],
              ["🌐", "All Meta", "FB + IG + Meta"],
            ].map(([icon, label, sub]) => (
              <div key={label} style={{
                background: customBg ? "rgba(10,10,20,0.6)" : t.surface,
                backdropFilter: customBg ? "blur(12px)" : "none",
                border: `1px solid ${t.border}`,
                borderRadius: 14, padding: "14px 18px", flex: "1 1 140px",
                textAlign: "center", minWidth: 130
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SETTINGS SIDEBAR
        ══════════════════════════════════════════════════ */}
        {showSettings && (
          <div style={S.settingsPanel} className="fadeUp">
            <div style={S.settingsTitle}>
              <span>Settings</span>
              <button
                style={{ ...S.iconBtn, width: 30, height: 30, fontSize: 13 }}
                onClick={() => setShowSettings(false)}
              >✕</button>
            </div>

            {/* Theme */}
            <div style={S.settingsLabel}>Theme</div>
            <div style={S.themeRow}>
              {Object.entries(THEMES).map(([key, val]) => (
                <button
                  key={key}
                  style={S.themeChip(themeKey === key)}
                  onClick={() => setThemeKey(key)}
                >
                  {key === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>

            {/* Custom BG */}
            <div style={S.settingsLabel}>Background Image</div>
            <div
              style={S.bgPreview}
              onClick={() => bgFileRef.current?.click()}
            >
              {customBg ? (
                <img src={customBg} alt="bg preview" style={S.bgImg} />
              ) : (
                <span style={{ fontSize: 12, color: t.textDim }}>
                  {bgUploading ? "Uploading…" : "Tap to set custom background"}
                </span>
              )}
            </div>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleBgUpload}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.smallBtn} onClick={() => bgFileRef.current?.click()}>
                📷 Choose Image
              </button>
              {customBg && (
                <button style={S.dangerBtn} onClick={removeBg}>✕ Remove</button>
              )}
            </div>

            {/* History management */}
            <div style={S.settingsLabel}>Data</div>
            <button
              style={S.dangerBtn}
              onClick={() => {
                if (confirm("Clear all download history?")) setHistory([]);
              }}
            >
              🗑 Clear History ({history.length})
            </button>

            <div style={{ marginTop: 32, fontSize: 11, color: t.textDim, lineHeight: 1.6 }}>
              MetaSaver v1.0<br />
              All settings saved to your device.
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            HISTORY SIDEBAR
        ══════════════════════════════════════════════════ */}
        {showHistory && (
          <div style={S.settingsPanel} className="fadeUp">
            <div style={S.settingsTitle}>
              <span>History</span>
              <button
                style={{ ...S.iconBtn, width: 30, height: 30, fontSize: 13 }}
                onClick={() => setShowHistory(false)}
              >✕</button>
            </div>

            {history.length === 0 ? (
              <div style={{ color: t.textDim, fontSize: 13, marginTop: 20 }}>
                No downloads yet. Start saving videos!
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  style={S.histItem}
                  onClick={() => {
                    setUrl(item.url);
                    setShowHistory(false);
                    setResult({
                      success: true,
                      platform: item.platform,
                      title: item.title,
                      thumbnail: item.thumbnail,
                      video: item.videoUrl,
                    });
                  }}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" style={S.histThumb} />
                  ) : (
                    <div style={{ ...S.histThumb, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      ▶
                    </div>
                  )}
                  <div style={S.histMeta}>
                    <div style={S.histTitle}>{item.title || "Untitled"}</div>
                    <div style={S.histTime}>
                      {item.platform && `${item.platform} · `}{relativeTime(item.fetchedAt)}
                    </div>
                  </div>
                  {item.videoUrl && (
                    <button
                      style={{ ...S.iconBtn, flexShrink: 0, fontSize: 13 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadVideo(item.videoUrl, `${item.title?.slice(0, 40) || "video"}.mp4`);
                      }}
                    >⬇</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Backdrop for sidebars on mobile */}
        {(showSettings || showHistory) && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
              zIndex: 99, backdropFilter: "blur(2px)"
            }}
            onClick={() => { setShowSettings(false); setShowHistory(false); }}
          />
        )}
      </div>
    </>
  );
}
