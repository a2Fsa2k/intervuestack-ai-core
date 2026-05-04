import type { InputBundle } from "./types";
import type { RouterStateId, StateTransition, TransitionConditionId } from "./stateMachine";
import { ROUTER_STATES } from "./stateMachine";

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = norm(haystack);
  return needles.some((n) => h.includes(norm(n)));
}

export function evaluateCondition(cond: TransitionConditionId, bundle: InputBundle, t?: StateTransition): boolean {
  const text = bundle.userInput ?? "";
  const hasText = norm(text).length > 0;

  switch (cond) {
    case "userResponded":
      return hasText;
    case "userSaysReady":
      return includesAny(text, ["ready", "yes", "ok", "okay", "sure", "lets go", "let's go", "start"]);
    case "userGivesUp":
      return includesAny(text, ["give up", "can't", "cannot", "no idea", "stuck", "hint", "help"]);
    case "userAsksQuestion":
      return text.includes("?") || includesAny(text, ["what", "why", "how", "clarify", "constraints"]);
    case "idle_60s":
      return bundle.idleMs >= 60_000;
    case "idle_120s":
      return bundle.idleMs >= 120_000;
    case "mentions_topic": {
      // crude topic detection; can be expanded later
      if (!hasText) return false;
      const keywords = t?.keywords ?? ["array", "string", "graph", "dp", "dynamic programming", "hashmap", "tree"];
      return includesAny(text, keywords);
    }
    default:
      return false;
  }
}

function mapTimerSignal(bundle: InputBundle): RouterStateId {
  // Deterministic mapping. For now, keep state unchanged.
  return bundle.currentStateId as RouterStateId;
}

function mapMonitorSignal(bundle: InputBundle): RouterStateId {
  // Deterministic mapping. For now, keep state unchanged.
  return bundle.currentStateId as RouterStateId;
}

/** PURE FUNCTION: no LLM, no I/O. */
export function classify(bundle: InputBundle): RouterStateId {
  // Monitor signals (deterministic)
  if (bundle.signalType === "monitor") {
    const signals = bundle.store.secondary?.lastMonitorSignals ?? [];

    // Stickiness: if already in coding_progressing and still progressing, stay there.
    if (bundle.currentStateId === "coding_progressing" && signals.includes("PROGRESSING")) {
      return "coding_progressing";
    }

    if (signals.includes("NO_PROGRESS") && bundle.currentStateId === "coding") {
      return "stuck_coding";
    }

    if (signals.includes("DIVERGED")) {
      if (bundle.currentStateId === "coding") {
        return "coding_check_in";
      }
      return bundle.currentStateId as RouterStateId;
    }

    if (signals.includes("PROGRESSING") && bundle.currentStateId === "coding") {
      return "coding_progressing";
    }

    return bundle.currentStateId as RouterStateId;
  }

  // Timer / idle signals (deterministic)
  if (bundle.signalType === "timer") {
    const { idleMs, currentStateId } = bundle;

    if (currentStateId === "coding" && idleMs > 60_000) {
      return "coding_check_in";
    }

    if (currentStateId === "coding" && idleMs > 120_000) {
      return "stuck_coding";
    }

    return currentStateId as RouterStateId;
  }

  const cfg = ROUTER_STATES[bundle.currentStateId as RouterStateId];
  if (!cfg) return bundle.currentStateId as RouterStateId;

  for (const tr of cfg.transitions) {
    if (evaluateCondition(tr.when, bundle, tr)) return tr.to;
  }

  return bundle.currentStateId as RouterStateId;
}
