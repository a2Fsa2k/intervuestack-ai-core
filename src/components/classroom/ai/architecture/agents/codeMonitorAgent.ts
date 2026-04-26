export interface CodeMonitorInput {
  currentCode: string;
  previousCode: string;
  phase: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  problemMetadata?: Record<string, any>;
  now: number;
  lastMeaningfulChangeAt?: number;
}

export interface CodeMonitorOutput {
  signals: string[];
  metrics: {
    lineCount: number;
    syntaxValid: boolean;
    hasLoop: boolean;
    nestedLoops: boolean;
    hasReturn: boolean;
    changedMeaningfully: boolean;
  };
  updatedLastMeaningfulChangeAt: number;
}

function normalizeForDiff(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "") // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // remove block comments
    .replace(/\s+/g, " ")
    .trim();
}

function safeSyntaxCheck(code: string): boolean {
  try {
    // Lightweight parse check; does not execute.
    // eslint-disable-next-line no-new-func
    new Function(`"use strict";\n${code}`);
    return true;
  } catch {
    return false;
  }
}

function countRegex(code: string, re: RegExp): number {
  const m = code.match(re);
  return m ? m.length : 0;
}

export function codeMonitorAgent(input: CodeMonitorInput): CodeMonitorOutput {
  const { currentCode, previousCode, phase, now } = input;
  const prevNorm = normalizeForDiff(previousCode);
  const currNorm = normalizeForDiff(currentCode);

  const changedMeaningfully = currNorm !== prevNorm;
  const updatedLastMeaningfulChangeAt = changedMeaningfully ? now : input.lastMeaningfulChangeAt ?? now;

  const lineCount = currentCode.split("\n").filter((l) => l.trim().length > 0).length;
  const syntaxValid = currentCode.trim().length === 0 ? true : safeSyntaxCheck(currentCode);

  const loopCount = countRegex(currentCode, /\b(for|while)\b/g);
  const hasLoop = loopCount > 0;
  const nestedLoops = loopCount >= 2; // heuristic

  const hasReturn = /\breturn\b/.test(currentCode);

  // Signals
  const signals: string[] = [];

  // In coding phases, syntax errors frequently block progress.
  if ((phase === "coding" || phase === "testing" || phase === "optimization") && !syntaxValid) {
    signals.push("syntax_error");
  }

  // Heuristic brute-force detection: nested loops in medium problems.
  const difficulty = input.problemMetadata?.difficulty as string | undefined;
  if (difficulty === "medium" && nestedLoops) {
    signals.push("likely_bruteforce");
  }

  // Likely completion: return present + syntax valid + meaningful change.
  if ((phase === "coding" || phase === "testing") && syntaxValid && hasReturn && changedMeaningfully) {
    signals.push("solution_progress");
  }

  // No progress for long duration (only meaningful in coding-ish phases)
  const lastMeaningful = updatedLastMeaningfulChangeAt;
  const idleMs = now - lastMeaningful;
  if ((phase === "coding" || phase === "testing" || phase === "optimization") && idleMs >= 90_000) {
    signals.push("stuck_no_progress");
  }

  // Thrashing: lots of changes but not stabilizing (very rough heuristic)
  const churn = Math.abs(currNorm.length - prevNorm.length);
  if ((phase === "coding" || phase === "testing") && changedMeaningfully && churn > 250) {
    signals.push("rapid_rewrite");
  }

  return {
    signals,
    metrics: {
      lineCount,
      syntaxValid,
      hasLoop,
      nestedLoops,
      hasReturn,
      changedMeaningfully
    },
    updatedLastMeaningfulChangeAt
  };
}
