import type { StoreAction } from "../architecture/store";
import type { InputBundle, RouterLLMOutput } from "./types";
import type { RouterStateId } from "./stateMachine";
import { classify } from "./classifier";

export interface TransitionResult {
  nextStateId: RouterStateId;
  dispatches: StoreAction[];
}

function coerceStoreUpdates(upd: unknown): StoreAction[] {
  if (Array.isArray(upd)) return upd as StoreAction[];
  return [];
}

export function applyTransition(opts: {
  bundle: InputBundle;
  llm: RouterLLMOutput;
}): TransitionResult {
  const dispatches: StoreAction[] = [];

  // 1) Apply store_updates
  dispatches.push(...coerceStoreUpdates(opts.llm.store_updates));

  // 2) Transcript append + rolling summary update are handled in controller layer today.

  // 4) Re-run classifier (event) to compute next state deterministically.
  const nextStateId = classify({ ...opts.bundle, currentStateId: opts.bundle.currentStateId, signalType: "event" });

  // 5) Update currentStateId: controller will store it.
  return { nextStateId, dispatches };
}
