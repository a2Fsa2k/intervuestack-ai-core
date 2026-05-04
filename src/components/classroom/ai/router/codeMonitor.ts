export type RouterCodeSignal = "IDLE" | "NO_PROGRESS" | "DIVERGED";

export interface CodeMonitorInput {
  currentCode: string;
  previousCode: string;
  idleMs: number;
}

export interface CodeMonitorOutput {
  signals: RouterCodeSignal[];
  changed: boolean;
}

function normalize(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function codeMonitor(input: CodeMonitorInput): CodeMonitorOutput {
  const curr = normalize(input.currentCode);
  const prev = normalize(input.previousCode);
  const changed = curr !== prev;

  const signals: RouterCodeSignal[] = [];
  if (input.idleMs >= 60_000) signals.push("IDLE");
  if (!changed && input.idleMs >= 90_000) signals.push("NO_PROGRESS");
  if (changed && Math.abs(curr.length - prev.length) > 400) signals.push("DIVERGED");

  return { signals, changed };
}
