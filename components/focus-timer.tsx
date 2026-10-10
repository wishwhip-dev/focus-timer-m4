"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { database } from "@/lib/db";
import { countSessionsOnDay, localDayKey, recordSession } from "@/lib/data/sessions";
import { getSetting, setSetting } from "@/lib/data/settings";
import {
  playChime,
  setAudioBackgroundPolicy,
  setMuted,
  unlockAudio,
  useAudioStatus,
} from "@/lib/audio";
import { useStoredQuery } from "@/lib/storage/react";
import { cn } from "@/lib/utils";

const FOCUS_MS = 25 * 60_000;
const BREAK_MS = 5 * 60_000;
const MUTE_KEY = "chimeMuted";

type Mode = "focus" | "break";
/** ready = sitting at full time; running; paused mid-count; done = just chimed, next mode queued. */
type Phase = "ready" | "running" | "paused" | "done";

const MODE_LABEL: Record<Mode, string> = { focus: "Focus", break: "Short break" };

/** Whole seconds left, rounded up so the readout leaves 25:00 the moment a second has passed. */
function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [phase, setPhase] = useState<Phase>("ready");
  const [remainingMs, setRemainingMs] = useState(FOCUS_MS);
  const endsAtRef = useRef<number | null>(null);
  const status = useAudioStatus();

  // The mute choice lives in the database so it survives a reload. It is read as state, not
  // mirrored into state, so nothing here sets state from an effect.
  const muteQuery = useStoredQuery(database, () => getSetting(MUTE_KEY));
  const muted = muteQuery.data === "true";
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Today's finished focus sessions. The day key is computed inside the query (browser only, so
  // it never touches the server render) and re-checked every half minute so a tab left open
  // overnight starts counting the new day instead of showing yesterday's total.
  const [dayKey, setDayKey] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const key = localDayKey(new Date());
      setDayKey((previous) => (previous === key ? previous : key));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const todayQuery = useStoredQuery(
    database,
    () => countSessionsOnDay("focus", dayKey ?? localDayKey(new Date())),
    [dayKey],
  );

  const durationMs = mode === "focus" ? FOCUS_MS : BREAK_MS;

  const complete = useCallback(() => {
    const endedAt = endsAtRef.current ?? Date.now();
    endsAtRef.current = null;
    setRemainingMs(0);
    setPhase("done");
    setMuted(mutedRef.current);
    playChime({ frequency: 660, durationMs: 220, gain: 0.2 });
    if (mode === "focus") {
      void recordSession("focus", endedAt).catch((error: unknown) => {
        toast.error("Could not save the finished session", {
          description: error instanceof Error ? error.message : "Unknown error.",
        });
      });
    }
    setMode(mode === "focus" ? "break" : "focus");
  }, [mode]);

  const tick = useCallback(() => {
    const endsAt = endsAtRef.current;
    if (endsAt === null) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      complete();
      return;
    }
    setRemainingMs(remaining);
  }, [complete]);

  // Real elapsed time, not ticks: the readout is computed from the end timestamp every poll, so a
  // throttled background tab still shows the true remaining time the moment it is seen again.
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, tick]);

  const handleStart = useCallback(async () => {
    // Sound is unlocked here, inside this gesture, before any chime is ever scheduled.
    setAudioBackgroundPolicy("keep");
    await unlockAudio();
    setMuted(mutedRef.current);
    const from = phase === "paused" ? remainingMs : durationMs;
    endsAtRef.current = Date.now() + from;
    setRemainingMs(from);
    setPhase("running");
  }, [phase, remainingMs, durationMs]);

  const handlePause = useCallback(() => {
    const endsAt = endsAtRef.current;
    if (endsAt === null) return;
    setRemainingMs(Math.max(0, endsAt - Date.now()));
    endsAtRef.current = null;
    setPhase("paused");
  }, []);

  /** Reset always returns to the full length of the current mode; nothing is recorded. */
  const handleReset = useCallback(() => {
    endsAtRef.current = null;
    setRemainingMs(durationMs);
    setPhase("ready");
  }, [durationMs]);

  const toggle = useCallback(() => {
    if (phase === "running") handlePause();
    else void handleStart();
  }, [phase, handlePause, handleStart]);

  // Space starts or pauses, R resets. Skipped when a button or field has focus, so Space still
  // presses the focused control; preventDefault keeps the page from scrolling.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, input, textarea, select, a, [contenteditable], [role=\"button\"]")) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleReset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, handleReset]);

  const handleToggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    if (!next && status === "running") {
      // A short confirmation so "Turn chime on" is heard to have worked.
      playChime({ frequency: 660, durationMs: 140, gain: 0.12 });
    }
    void setSetting(MUTE_KEY, String(next)).catch((error: unknown) => {
      toast.error("Could not save the sound setting", {
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    });
  };

  const primaryLabel =
    phase === "running" ? "Pause" : phase === "paused" ? "Resume" : phase === "done" ? `Start ${MODE_LABEL[mode].toLowerCase()}` : "Start";
  const elapsedMs = Math.min(durationMs, Math.max(0, durationMs - remainingMs));
  const progress = phase === "done" ? 100 : (elapsedMs / durationMs) * 100;
  const doneMessage =
    mode === "break" ? "Focus session complete — time for a short break." : "Break over — ready to focus again.";

  return (
    <section aria-label="Focus timer" className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-widest",
            mode === "focus" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {MODE_LABEL[mode]}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm text-muted-foreground",
            phase === "done" && "text-primary",
          )}
        >
          {phase === "running" && <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary" />}
          {phase === "running" ? "Running" : phase === "paused" ? "Paused" : phase === "done" ? "Complete" : "Ready"}
        </span>
      </div>

      <p
        role="timer"
        aria-label={`${MODE_LABEL[mode]}: ${formatClock(remainingMs)} remaining`}
        className={cn(
          "font-semibold tabular-nums tracking-tight text-[clamp(4.5rem,22vw,8rem)] leading-none",
          phase === "running" ? "text-foreground" : phase === "paused" ? "text-muted-foreground/60" : "text-foreground/90",
        )}
      >
        {formatClock(remainingMs)}
      </p>

      <div
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      <p aria-live="polite" className="min-h-6 text-center text-base text-muted-foreground">
        {phase === "done" ? doneMessage : phase === "paused" ? "Paused — press Resume to continue." : `A ${MODE_LABEL[mode].toLowerCase()} is ${durationMs / 60_000} minutes.`}
      </p>

      <div className="flex w-full max-w-xs flex-col items-stretch gap-3">
        <Button onClick={toggle} className="h-20 rounded-2xl text-2xl font-semibold" aria-label={phase === "running" ? "Pause timer" : `${primaryLabel} timer`}>
          {primaryLabel}
        </Button>
        <Button onClick={handleReset} variant="outline" className="h-12 rounded-xl text-base" aria-label="Reset timer">
          Reset
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <Button
          onClick={handleToggleMute}
          variant="ghost"
          size="sm"
          aria-label={muted ? "Turn chime on" : "Mute chime"}
          aria-pressed={muted}
        >
          {muted ? "Chime off" : "Chime on"}
        </Button>
        {status === "suspended" && <p className="text-xs text-muted-foreground">Sound is paused. Press Start to enable it.</p>}
        {status === "unsupported" && <p className="text-xs text-muted-foreground">Sound is not available in this browser.</p>}
      </div>

      <p className="text-lg font-medium">
        {todayQuery.isLoading ? "Sessions today: …" : `Sessions today: ${todayQuery.data ?? 0}`}
      </p>
    </section>
  );
}