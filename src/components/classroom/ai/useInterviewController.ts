import { useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { useClassroomContext } from "../runtime/ClassroomContext";
import type { CodeEvalResult, InterviewState, TranscriptTurn } from "./types";
import { evaluateUserCodeJS } from "./codeEval";
import { generateStructuredFeedback } from "./feedback/feedbackGenerator";
import { createInitialStoreState, aiInterviewStoreReducer } from "./architecture/store";
import { runRouterStep } from "./router/runRouter";
import { codeMonitorAgent } from "./architecture/agents/codeMonitorAgent";
import { generateOpenAIJSON } from "./openaiClient";

function uuid() {
  return crypto.randomUUID();
}

function createInitialInterviewStateLocal(): InterviewState {
  const now = Date.now();
  return {
    phase: "intro",
    preferredLanguage: "javascript",
    createdAt: now,
    updatedAt: now,
    rollingSummary: ""
  };
}

export function useInterviewController() {
  const { state: classroomState, dispatch } = useClassroomContext();

  // Router state id (strict state-machine)
  const [routerStateId, setRouterStateId] = useState<import("./router/stateMachine").RouterStateId>("greeting_init");
  const routerStateIdRef = useRef(routerStateId);
  useEffect(() => {
    routerStateIdRef.current = routerStateId;
  }, [routerStateId]);

  const [interview, setInterview] = useState<InterviewState>(() => createInitialInterviewStateLocal());
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastEval, setLastEval] = useState<CodeEvalResult | null>(null);
  const [feedback, setFeedback] = useState<import("./feedback/feedbackGenerator").StructuredFeedback | null>(null);

  // Cooldown for autonomous (timer/monitor) interventions
  const lastAutoInterventionAtRef = useRef<number>(0);

  // Safety: do not auto-intervene if an AI message was just sent
  const lastAiMessageAtRef = useRef<number>(0);

  // Lightweight anti-jitter: minimum duration before allowing state changes
  const lastStateChangeAtRef = useRef<number>(Date.now());

  // Timer bookkeeping (no LLM calls unless a milestone triggers)
  const elapsedMsRef = useRef(0);
  const lastUserActivityAtRef = useRef<number>(Date.now());
  const codingPhaseEnteredAtRef = useRef<number | null>(null);
  const lastTimerInterventionAtRef = useRef<number>(0);
  const timerFlagsRef = useRef({
    inactivityWarned: false,
    codingTimeWarned: false,
    softWarned: false,
    hardStopped: false
  });

  // New single store (slices: main + secondary)
  const [aiStore, aiDispatch] = useReducer(aiInterviewStoreReducer, undefined, () =>
    createInitialStoreState(uuid())
  );
  const aiStoreRef = useRef(aiStore);
  useEffect(() => {
    aiStoreRef.current = aiStore;
  }, [aiStore]);

  const startedAtRef = useRef<number>(Date.now());

  // ...existing refs...
  const interviewRef = useRef(interview);
  const transcriptRef = useRef(transcript);
  const lastEvalRef = useRef(lastEval);

  useEffect(() => {
    interviewRef.current = interview;
  }, [interview]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    lastEvalRef.current = lastEval;
  }, [lastEval]);

  const hydratedRef = useRef(false);

  const pushTurn = useCallback((turn: Omit<TranscriptTurn, "id" | "timestamp">) => {
    const next: TranscriptTurn = { id: uuid(), timestamp: Date.now(), ...turn };
    setTranscript((prev: TranscriptTurn[]) => [...prev, next]);
    return next;
  }, []);

  // Concurrency guard: prevent overlapping orchestrator calls
  const inFlightRef = useRef(false);

  // Code monitor state (local, cheap)
  const lastCodeSnapshotRef = useRef<string>("");
  const lastMeaningfulCodeChangeAtRef = useRef<number>(Date.now());
  const recentCodeSignalsRef = useRef<string[]>([]);
  const lastCodeInterventionAtRef = useRef<number>(0);
  const syntaxErrorStreakRef = useRef<number>(0);

  // Rolling summary cadence
  const lastSummaryTurnCountRef = useRef<number>(0);

  async function maybeUpdateRollingSummary(useTranscript: TranscriptTurn[]) {
    // Update every ~6 turns (cheap & bounded)
    if (useTranscript.length - lastSummaryTurnCountRef.current < 6) return;
    lastSummaryTurnCountRef.current = useTranscript.length;

    // Build a compact input: current store state + tail.
    const tail = useTranscript
      .slice(-10)
      .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
      .join("\n");

    const system =
      "You compress interview context into a rolling summary for an AI interviewer. Keep it short, factual, and actionable.";

    const user = [
      "Return ONLY valid JSON: { summary: string }",
      `Phase: ${aiStoreRef.current.main.phase}`,
      `Topic: ${aiStoreRef.current.main.selectedTopic ?? "(none)"}`,
      `Problem: ${aiStoreRef.current.main.problem?.title ?? "(none)"}`,
      `Existing summary: ${aiStoreRef.current.main.rollingSummary || "(empty)"}`,
      "Recent transcript tail:",
      tail
    ].join("\n");

    const out = await generateOpenAIJSON<{ summary: string }>({
      system,
      user,
      model: "gpt-4o-mini",
      temperature: 0.2,
      validate: (v: unknown): v is { summary: string } =>
        !!v && typeof v === "object" && typeof (v as any).summary === "string",
      fallback: { summary: aiStoreRef.current.main.rollingSummary }
    });

    aiDispatch({ type: "MAIN/SET_ROLLING_SUMMARY", summary: out.summary.slice(0, 1200) });
  }

  const runArchitectureStep = useCallback(
    async (reason: "event" | "timer" | "monitor", payload?: { userInput?: string; transcript?: TranscriptTurn[] }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (reason === "event") setIsThinking(true);

      try {
        const useTranscript = payload?.transcript ?? transcriptRef.current;
        const now = Date.now();

        if (reason === "event") {
          lastUserActivityAtRef.current = now;
          timerFlagsRef.current.inactivityWarned = false;
        }

        if (reason !== "event" && now - lastStateChangeAtRef.current < 15_000) {
          return;
        }

        const elapsedMs = now - startedAtRef.current;
        const idleMs = now - lastUserActivityAtRef.current;

        const currentStateId = routerStateIdRef.current;

        const res = await runRouterStep({
          userInput: payload?.userInput,
          userCode: classroomState.code,
          signalType: reason,
          currentStateId,
          store: aiStoreRef.current,
          elapsedMs,
          idleMs,
          transcriptTail: useTranscript.slice(-10)
        });

        // Persist router state (controller = memory)
        if (res.nextStateId && res.nextStateId !== routerStateIdRef.current) {
          // eslint-disable-next-line no-console
          console.log("STATE TRANSITION:", routerStateIdRef.current, "→", res.nextStateId);
          routerStateIdRef.current = res.nextStateId;
          setRouterStateId(res.nextStateId);
        }

        for (const a of res.dispatches) aiDispatch(a);

        if (res.aiMessage) {
          lastAiMessageAtRef.current = now;
          lastStateChangeAtRef.current = now;
          pushTurn({
            role: "ai",
            text: res.aiMessage,
            meta: {
              phase: aiStoreRef.current.main.phase,
              actionType: "ROUTER_STEP",
              reason,
              routerStateId: routerStateIdRef.current
            }
          });
        }

        // Update rolling summary occasionally
        try {
          await maybeUpdateRollingSummary(useTranscript);
        } catch {
          // ignore summary failures (non-critical)
        }

        // Keep legacy InterviewState roughly in sync for existing UI + feedback generator.
        setInterview((prev: InterviewState) => ({
          ...prev,
          phase: aiStoreRef.current.main.phase,
          selectedTopic: aiStoreRef.current.main.selectedTopic,
          problem: aiStoreRef.current.main.problem,
          rollingSummary: aiStoreRef.current.main.rollingSummary,
          updatedAt: now
        }));

        // If we now have a problem, keep classroom runtime in sync.
        const nextProblem = aiStoreRef.current.main.problem;
        if (nextProblem?.id) {
          dispatch({ type: "SET_ACTIVE_PROBLEM", problemId: nextProblem.id });
        }

        // Optional code eval (deterministic) if orchestrator indicates.
        // Router path: keep existing eval behavior only when phase is code_review/testing.
        if (aiStoreRef.current.main.problem && (routerStateIdRef.current === "code_review" || aiStoreRef.current.main.phase === "testing")) {
          const evalResult = await evaluateUserCodeJS({ userCode: classroomState.code, problem: aiStoreRef.current.main.problem });
          setLastEval(evalResult);
          aiDispatch({ type: "SECONDARY/SET_CODE_EVAL", result: evalResult });
        }
      } catch (e) {
        pushTurn({ role: "system", text: `AI error: ${e instanceof Error ? e.message : String(e)}` });
      } finally {
        if (reason === "event") setIsThinking(false);
        inFlightRef.current = false;
      }
    },
    [classroomState.code, dispatch, pushTurn]
  );

  const sendUserText = useCallback(
    async (text: string) => {
      const userTurn: TranscriptTurn = { id: uuid(), timestamp: Date.now(), role: "user", text };

      // Update transcript immediately
      const nextTranscript = [...transcriptRef.current, userTurn];
      setTranscript(nextTranscript);

      // Update store main signals
      aiDispatch({ type: "MAIN/SET_LAST_USER_INPUT", text, at: Date.now() });

      // Run orchestrator on event
      await runArchitectureStep("event", { userInput: text, transcript: nextTranscript });
    },
    [runArchitectureStep]
  );

  // Auto-start: initial AI turn.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void runArchitectureStep("event");
  }, [runArchitectureStep]);

  // Timer: only triggers milestone interventions (no periodic LLM calls)
  useEffect(() => {
    const CHECK_EVERY_MS = 5_000;
    const INACTIVITY_MS = 90_000;
    const CODING_TOO_LONG_MS = 8 * 60_000;
    const SOFT_SESSION_MS = 25 * 60_000;
    const HARD_SESSION_MS = 35 * 60_000;
    const TIMER_COOLDOWN_MS = 60_000;

    const id = window.setInterval(() => {
      if (feedback || interviewRef.current.phase === "ended") return;
      if (inFlightRef.current) return;

      const now = Date.now();
      elapsedMsRef.current = now - startedAtRef.current;

      // Hard stop (only once)
      if (!timerFlagsRef.current.hardStopped && elapsedMsRef.current >= HARD_SESSION_MS) {
        timerFlagsRef.current.hardStopped = true;
        void runArchitectureStep("timer", { userInput: "[TIMER_HARD_STOP]" });
        return;
      }

      // Router timer signal (idle-based) with cooldown
      const sinceAuto = now - lastAutoInterventionAtRef.current;
      const idleMs = now - lastUserActivityAtRef.current;

      // Safety: do not auto-intervene if AI just spoke
      if (now - lastAiMessageAtRef.current < 30_000) return;

      if (sinceAuto >= 30_000) {
        // Only send timer signals when in coding-ish router states
        if (routerStateIdRef.current === "coding" && idleMs >= 60_000) {
          lastAutoInterventionAtRef.current = now;
          void runArchitectureStep("timer", { userInput: "[TIMER_IDLE]" });
          return;
        }
      }

      // Enforce cooldown for non-hard-stop interventions
      const sinceLastIntervention = now - lastTimerInterventionAtRef.current;
      if (sinceLastIntervention < TIMER_COOLDOWN_MS) return;

      // Soft session warning (only once)
      if (!timerFlagsRef.current.softWarned && elapsedMsRef.current >= SOFT_SESSION_MS) {
        timerFlagsRef.current.softWarned = true;
        lastTimerInterventionAtRef.current = now;
        void runArchitectureStep("timer", { userInput: "[TIMER_SOFT_WARNING]" });
        return;
      }

      // Inactivity warning (only once per inactivity epoch)
      const inactiveFor = now - lastUserActivityAtRef.current;
      if (!timerFlagsRef.current.inactivityWarned && inactiveFor >= INACTIVITY_MS) {
        timerFlagsRef.current.inactivityWarned = true;
        lastTimerInterventionAtRef.current = now;
        void runArchitectureStep("timer", { userInput: "[TIMER_INACTIVITY]" });
        return;
      }

      // Coding phase exceeded threshold
      const codingEnteredAt = codingPhaseEnteredAtRef.current;
      if (codingEnteredAt && !timerFlagsRef.current.codingTimeWarned && now - codingEnteredAt >= CODING_TOO_LONG_MS) {
        timerFlagsRef.current.codingTimeWarned = true;
        lastTimerInterventionAtRef.current = now;
        void runArchitectureStep("timer", { userInput: "[TIMER_CODING_TOO_LONG]" });
        return;
      }
    }, CHECK_EVERY_MS);

    return () => window.clearInterval(id);
  }, [feedback, runArchitectureStep]);

  // Debounced code monitoring (never on every keystroke)
  useEffect(() => {
    if (feedback || interviewRef.current.phase === "ended") return;

    const DEBOUNCE_MS = 900;

    const t = window.setTimeout(() => {
      const now = Date.now();
      const phase = aiStoreRef.current.main.phase;
      const problem = aiStoreRef.current.main.problem;

      const prev = lastCodeSnapshotRef.current;
      const curr = classroomState.code;

      const monitor = codeMonitorAgent({
        currentCode: curr,
        previousCode: prev,
        phase,
        problemMetadata: problem as unknown as Record<string, any>,
        now,
        lastMeaningfulChangeAt: lastMeaningfulCodeChangeAtRef.current
      });

      lastCodeSnapshotRef.current = curr;
      lastMeaningfulCodeChangeAtRef.current = monitor.updatedLastMeaningfulChangeAt;
      recentCodeSignalsRef.current = monitor.signals;

      // Map existing agent's signals to router monitor signals
      const monitorSignals: string[] = [];
      if (monitor.signals.includes("stuck_no_progress")) monitorSignals.push("NO_PROGRESS");
      if (monitor.signals.includes("rapid_rewrite")) monitorSignals.push("DIVERGED");
      if (monitor.signals.includes("progressing")) monitorSignals.push("PROGRESSING");

      // Persist monitor signals into store for classifier routing
      aiDispatch({ type: "SECONDARY/SET_MONITOR_SIGNALS", signals: monitorSignals });

      // Only intervene on meaningful router signals (PROGRESSING never triggers by itself)
      const meaningful = monitorSignals.includes("NO_PROGRESS") || monitorSignals.includes("DIVERGED");
      if (!meaningful) return;

      if (inFlightRef.current) return;

      // Safety: do not auto-intervene if AI just spoke
      if (now - lastAiMessageAtRef.current < 30_000) return;

      if (now - lastAutoInterventionAtRef.current < 30_000) return;

      lastAutoInterventionAtRef.current = now;
      void runArchitectureStep("monitor", { userInput: "[MONITOR_SIGNAL]" });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [classroomState.code, feedback, runArchitectureStep]);

  const transcriptTextForDebug = useMemo(
    () =>
      transcript
        .map((t: TranscriptTurn) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.role}: ${t.text}`)
        .join("\n"),
    [transcript]
  );

  return {
    interview,
    transcript,
    transcriptTextForDebug,
    isThinking,
    lastEval,
    sendUserText,
    feedback
  };
}
