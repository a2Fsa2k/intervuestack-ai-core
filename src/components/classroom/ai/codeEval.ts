import type { CodeEvalResult, InterviewProblem } from "./types";

function safeDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Very small in-browser evaluator for JS-only.
 * - Wraps user code in a Function
 * - Extracts the expected function
 * - Runs tests with timeouts via Promise.race
 */
export async function evaluateUserCodeJS(opts: {
  userCode: string;
  problem: InterviewProblem;
  timeoutMs?: number;
}): Promise<CodeEvalResult> {
  const { userCode, problem, timeoutMs = 800 } = opts;
  const failures: CodeEvalResult["failures"] = [];

  let fn: unknown;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(
      "console",
      `${userCode}\n; return typeof ${problem.evaluation.functionName} !== 'undefined' ? ${problem.evaluation.functionName} : undefined;`
    );
    fn = factory({ log: () => undefined, error: () => undefined, warn: () => undefined });
  } catch (e) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: problem.evaluation.tests.length,
      failures: [
        {
          name: "compile",
          expected: "valid code",
          received: null,
          error: e instanceof Error ? e.message : String(e)
        }
      ]
    };
  }

  if (typeof fn !== "function") {
    return {
      passed: false,
      passedCount: 0,
      totalCount: problem.evaluation.tests.length,
      failures: [
        {
          name: "export",
          expected: `function ${problem.evaluation.functionName}(...) to be defined`,
          received: typeof fn,
          error: `Define a function named ${problem.evaluation.functionName}.`
        }
      ]
    };
  }

  let passedCount = 0;

  for (const t of problem.evaluation.tests) {
    try {
      const run = Promise.resolve().then(() => (fn as (...args: unknown[]) => unknown)(...(t.input as unknown[])));
      const res = await Promise.race([
        run,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
      ]);

      if (safeDeepEqual(res, t.expected)) {
        passedCount++;
      } else {
        failures.push({ name: t.name, expected: t.expected, received: res });
      }
    } catch (e) {
      failures.push({
        name: t.name,
        expected: t.expected,
        received: null,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  return {
    passed: failures.length === 0,
    passedCount,
    totalCount: problem.evaluation.tests.length,
    failures
  };
}
