import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Package, Receipt, BarChart3, Clock } from "lucide-react";

type Stage =
  | "black"
  | "thunder"
  | "city"
  | "sign"
  | "walk"
  | "interior"
  | "spread"
  | "fragments"
  | "impact"
  | "logo"
  | "done";

const STAGE_DURATIONS: Record<Stage, number> = {
  black: 900,
  thunder: 500,
  city: 2200,
  sign: 1600,
  walk: 3200,
  interior: 1400,
  spread: 1800,
  fragments: 1800,
  impact: 550,
  logo: 2400,
  done: 0,
};

const ORDER: Stage[] = ["black", "thunder", "city", "sign", "walk", "interior", "spread", "fragments", "impact", "logo", "done"];

const SESSION_KEY = "srh-intro-seen";

export function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<Stage>("black");
  const [skippable, setSkippable] = useState(false);

  useEffect(() => {
    setTimeout(() => setSkippable(true), 900);

    let cancelled = false;
    let idx = 0;

    const advance = () => {
      if (cancelled) return;
      const current = ORDER[idx];
      if (current === "done") {
        onComplete();
        return;
      }
      const wait = STAGE_DURATIONS[current];
      const timer = setTimeout(() => {
        idx += 1;
        setStage(ORDER[idx]);
        advance();
      }, wait);
      return () => clearTimeout(timer);
    };

    advance();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishNow = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable — safe to ignore, intro will just replay
    }
    onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[999] bg-black overflow-hidden select-none"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Rain, present from "city" stage onward */}
      {stage !== "black" && stage !== "thunder" && (
        <div className="intro-rain" aria-hidden="true" />
      )}

      {/* Thunder flash */}
      <AnimatePresence>
        {stage === "thunder" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0, 0.25, 0] }}
            transition={{ duration: 0.5, times: [0, 0.15, 0.3, 0.5, 1] }}
            className="absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      {/* City + empty street backdrop, from "city" through "walk" */}
      <AnimatePresence>
        {(stage === "city" || stage === "sign" || stage === "walk") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-gradient-to-b from-[#04120e] via-[#050f0c] to-black"
          >
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0a1a15]/80 to-transparent" />
            {/* neon reflections on wet street */}
            <div className="absolute bottom-0 left-1/4 w-px h-32 bg-emerald-400/30 blur-sm" />
            <div className="absolute bottom-0 left-2/3 w-px h-24 bg-emerald-300/20 blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pharmacy neon sign glowing on */}
      <AnimatePresence>
        {(stage === "sign" || stage === "walk") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute top-[28%] right-[18%] flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{ opacity: [0.6, 1, 0.7, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_8px_rgba(16,185,129,0.35)]"
            >
              <Plus className="w-7 h-7 text-emerald-300" strokeWidth={3} />
            </motion.div>
            <span className="text-[10px] tracking-[0.3em] text-emerald-300/70 font-bold">PHARMACY</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walking silhouette, face hidden, long coat */}
      <AnimatePresence>
        {stage === "walk" && (
          <motion.div
            initial={{ x: "-15vw", opacity: 0 }}
            animate={{ x: "55vw", opacity: [0, 1, 1, 0.9] }}
            transition={{ duration: 3.2, ease: "linear" }}
            className="absolute bottom-0 w-10 h-40"
            style={{
              background: "linear-gradient(to bottom, #0a0a0a 0%, #000 70%)",
              clipPath: "polygon(35% 0%, 65% 0%, 78% 30%, 70% 100%, 30% 100%, 22% 30%)",
              filter: "drop-shadow(0 0 12px rgba(0,0,0,0.9))",
            }}
          />
        )}
      </AnimatePresence>

      {/* Interior: clock ticking */}
      <AnimatePresence>
        {(stage === "interior" || stage === "spread" || stage === "fragments") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-[#03100c]"
          >
            <div className="absolute top-10 right-10 flex items-center gap-2 text-emerald-400/60">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Clock className="w-6 h-6" />
              </motion.div>
              <span className="text-[10px] tracking-widest font-bold">SYSTEM ONLINE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emerald light spread + glass particles */}
      <AnimatePresence>
        {(stage === "spread" || stage === "fragments") && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 3, opacity: 0.35 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 w-40 h-40 -ml-20 -mt-20 rounded-full bg-emerald-500 blur-3xl"
          />
        )}
      </AnimatePresence>
      {(stage === "spread" || stage === "fragments") && (
        <div className="intro-particles" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.4}s` }} />
          ))}
        </div>
      )}

      {/* Futuristic UI fragments: inventory / billing / analytics flashes */}
      <AnimatePresence>
        {stage === "fragments" && (
          <>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: 0.1 }}
              className="absolute top-[30%] left-[15%] flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold"
            >
              <Package className="w-3.5 h-3.5" /> INVENTORY SYNCED
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="absolute top-[50%] right-[15%] flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold"
            >
              <Receipt className="w-3.5 h-3.5" /> BILLING READY
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: 0.9 }}
              className="absolute bottom-[28%] left-[40%] flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold"
            >
              <BarChart3 className="w-3.5 h-3.5" /> ANALYTICS LIVE
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Blackout + bass impact */}
      <AnimatePresence>
        {stage === "impact" && (
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: [1, 1.02, 1] }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>

      {/* Logo reveal */}
      <AnimatePresence>
        {stage === "logo" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3"
          >
            <motion.span
              initial={{ letterSpacing: "0.1em", opacity: 0 }}
              animate={{ letterSpacing: "0.15em", opacity: 1 }}
              transition={{ duration: 1.2 }}
              className="text-3xl font-black text-white"
            >
              SRH <span className="text-emerald-400">BUSINESS OS</span>
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="text-[11px] tracking-[0.25em] text-emerald-400/70 font-bold"
            >
              EMERALD GREEN. THE POWER OF GROWTH.
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {skippable && stage !== "done" && (
        <button
          type="button"
          onClick={finishNow}
          className="absolute top-5 right-5 z-10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white/70 border border-white/20 hover:bg-white/10 transition-colors"
        >
          Skip intro
        </button>
      )}
    </motion.div>
  );
}

/** True once per browser session — call from a client-only effect. */
export function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignore
  }
}
