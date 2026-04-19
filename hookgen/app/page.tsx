"use client";

import { useState, useCallback } from "react";

/* ──────────────────────────────────────────────
   Spinner Component
   ────────────────────────────────────────────── */
function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" }[size];
  return (
    <div className="flex items-center justify-center" role="status">
      <div
        className={`${dims} rounded-full border-2 border-white/10 border-t-amber-500 animate-spin-smooth`}
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Error Banner Component
   ────────────────────────────────────────────── */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto mt-6 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm flex items-start gap-3">
      <svg
        className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <p className="text-sm text-red-300 leading-relaxed flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-300 transition-colors p-0.5"
        aria-label="Dismiss error"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Result Card Shell
   ────────────────────────────────────────────── */
function ResultCard({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md overflow-hidden flex flex-col h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
        <span className="text-amber-400">{icon}</span>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-white/80">{title}</h3>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Page
   ────────────────────────────────────────────── */
export default function HomePage() {
  const [idea, setIdea] = useState("");
  
  // States
  const [loadingHook, setLoadingHook] = useState(false);
  const [hookText, setHookText] = useState<string | null>(null);
  
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const handleReset = useCallback(() => {
    setIdea("");
    setLoadingHook(false);
    setHookText(null);
    setLoadingVideo(false);
    setVideoUrl(null);
    setError(null);
    setElapsed(0);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!videoUrl) return;
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hookgen-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(videoUrl, "_blank");
    }
  }, [videoUrl]);

  const startVideoGeneration = useCallback(async (hook: string) => {
    setLoadingVideo(true);
    setElapsed(0);

    const timerStart = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate video.");
      }

      setVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video generation failed.");
    } finally {
      clearInterval(timer);
      setLoadingVideo(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setLoadingHook(true);
    setError(null);
    setHookText(null);
    setVideoUrl(null);
    setLoadingVideo(false);
    setElapsed(0);

    try {
      const res = await fetch("/api/generate-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate hook.");
      }

      setHookText(data.hook);
      
      // Auto trigger video generation directly after getting the hook
      startVideoGeneration(data.hook);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate your hook.");
    } finally {
      setLoadingHook(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden text-white flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#0a0a1a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d0d1f] to-[#0a0a0f]" />
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/[0.05] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 text-xl">⚡</span>
            <span className="text-lg font-bold tracking-tight text-white">HookGen</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-12 pb-16">
        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight max-w-4xl">
          <span className="text-white">Turn Your Idea Into a</span>{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Viral Hook Video
          </span>
        </h1>
        
        <p className="mt-5 text-center text-white/50 max-w-xl text-lg">
          Paste your content idea and let AI craft an attention-grabbing hook script and generate a ready-to-publish video.
        </p>

        {/* Input area */}
        <div className="mt-10 w-full max-w-2xl">
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-1.5 focus-within:border-amber-500/40 focus-within:shadow-[0_0_30px_rgba(245,158,11,0.05)] transition-all">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Paste your content idea here..."
              className="w-full min-h-[140px] bg-transparent rounded-xl px-4 py-4 text-white/90 focus:outline-none resize-none placeholder:text-white/20"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loadingHook || !idea.trim()}
            className={`mt-4 w-full py-4 rounded-xl font-semibold tracking-wide transition-all ${
              loadingHook || !idea.trim() 
                ? "bg-white/[0.06] text-white/30 cursor-not-allowed" 
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.99] text-white"
            } flex justify-center items-center gap-2`}
          >
            {loadingHook ? (
              <><Spinner size="sm" /> <span>Writing your viral hook...</span></>
            ) : (
              <span>Generate Hook + Video</span>
            )}
          </button>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Results grid */}
        {(loadingHook || hookText) && (
          <div className="w-full max-w-4xl mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Hook Script Result */}
            <ResultCard
              title="Your Hook Script"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              }
            >
              <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 min-h-[250px]">
                {loadingHook ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Spinner size="md" />
                    <p className="mt-4 text-sm text-white/50">Writing your hook...</p>
                  </div>
                ) : (
                  <>
                    <pre className="flex-1 whitespace-pre-wrap text-sm text-white/80 leading-relaxed font-[inherit]">
                      {hookText}
                    </pre>
                    <div className="mt-4 pt-4 border-t border-white/[0.04]">
                      <button
                        onClick={() => navigator.clipboard.writeText(hookText || "")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] text-white/60 hover:text-white/90 hover:bg-white/[0.1] transition-all"
                      >
                        Copy Script
                      </button>
                    </div>
                  </>
                )}
              </div>
            </ResultCard>

            {/* Video Result */}
            {hookText && (
              <ResultCard
                title="Your Hook Video"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                }
                delay={150}
              >
                {loadingVideo && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] bg-white/[0.02] border border-white/[0.04] rounded-xl text-center p-6">
                    <Spinner size="lg" />
                    <p className="mt-4 text-sm font-medium text-white/60">Generating your video... (1-3 mins)</p>
                    <p className="text-xs text-amber-400/60 mt-2 font-mono">
                      {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed
                    </p>
                  </div>
                )}
                
                {videoUrl && (
                  <div className="flex flex-col h-full gap-4">
                    <div className="flex-1 relative aspect-[9/16] max-h-[400px] w-full mx-auto rounded-xl overflow-hidden border border-white/[0.06]">
                      <video
                        src={videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover bg-black/20"
                      />
                    </div>
                    <button
                      onClick={handleDownload}
                      className="w-full py-3 rounded-lg text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white/90 border border-white/[0.04] transition-all"
                    >
                      Download Video
                    </button>
                  </div>
                )}
              </ResultCard>
            )}
          </div>
        )}

        {/* Generate Another */}
        {hookText && !loadingVideo && (
          <button
            onClick={handleReset}
            className="mt-12 text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            ← Generate another hook
          </button>
        )}
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full pb-8">
        <p className="text-center text-xs text-white/20">© {new Date().getFullYear()} HookGen</p>
      </footer>
    </main>
  );
}
