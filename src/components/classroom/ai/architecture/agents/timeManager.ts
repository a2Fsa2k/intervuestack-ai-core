import type { AIInterviewStoreState, TimingSignal } from "../store";

export interface TimeManagerOutput {
  timingSignals: TimingSignal[];
}

export function timeManager(opts: {
  secondary: AIInterviewStoreState["secondary"];
  startedAt: number;
  now: number;
  softLimitMs?: number;
  hardLimitMs?: number;
}): TimeManagerOutput {
  const { startedAt, now, softLimitMs = 25 * 60_000, hardLimitMs = 35 * 60_000 } = opts;
  const elapsedMs = now - startedAt;

  const timingSignals: TimingSignal[] = [{ type: "TICK", now, elapsedMs }];

  if (elapsedMs > hardLimitMs) {
    timingSignals.push({ type: "HARD_STOP", reason: "Hard interview time limit reached." });
  } else if (elapsedMs > softLimitMs) {
    timingSignals.push({ type: "SOFT_WARNING", message: "You are past the suggested time. Consider wrapping up." });
  }

  return { timingSignals };
}
