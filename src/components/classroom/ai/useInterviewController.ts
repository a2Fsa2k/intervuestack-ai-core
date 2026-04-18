import { useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { useClassroomContext } from "../runtime/ClassroomContext";
import type { CodeEvalResult, InterviewState, TranscriptTurn } from "./types";
import { evaluateUserCodeJS } from "./codeEval";
import { generateStructuredFeedback } from "./feedback/feedbackGenerator";
import { createInitialStoreState, aiInterviewStoreReducer } from "./architecture/store";
import { orchestratorAgent } from "./architecture/orchestratorAgent";

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

  const [interview, setInterview] = useState<InterviewState>(() => createInitialInterviewStateLocal());
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastEval, setLastEval] = useState<CodeEvalResult | null>(null);
  const [feedback, setFeedback] = useState<import("./feedback/feedbackGenerator").StructuredFeedback | null>(null);

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

  const runArchitectureStep = useCallback(
    async (reason: "event" | "timer", payload?: { userInput?: string; transcript?: TranscriptTurn[] }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Only show spinner for user-driven events
      if (reason === "event") setIsThinking(true);

      try {
        const useTranscript = payload?.transcript ?? transcriptRef.current;
        const now = Date.now();

        // Track last user activity on event steps.
        if (reason === "event") {
          lastUserActivityAtRef.current = now;
          timerFlagsRef.current.inactivityWarned = false;
        }

        const res = await orchestratorAgent({
          store: aiStoreRef.current,
          transcript: useTranscript,
          userInput: payload?.userInput,
          userCode: classroomState.code,
          startedAt: startedAtRef.current,
          now,
          reason
        });

        // Apply store updates
        for (const a of res.dispatches) aiDispatch(a);

        // Keep legacy InterviewState roughly in sync for existing UI + feedback generator.
        setInterview((prev: InterviewState) => ({
          ...prev,
          phase: aiStoreRef.current.main.phase,
          selectedTopic: aiStoreRef.current.main.selectedTopic,
          problem: aiStoreRef.current.main.problem,
          rollingSummary: aiStoreRef.current.main.rollingSummary,
          updatedAt: now
        }));

        // Detect phase entry for timing incentives
        const phaseNow = aiStoreRef.current.main.phase;
        if (phaseNow === "coding") {
          if (codingPhaseEnteredAtRef.current == null) codingPhaseEnteredAtRef.current = now;
        } else {
          codingPhaseEnteredAtRef.current = null;
          timerFlagsRef.current.codingTimeWarned = false;
        }

        // If we now have a problem, keep classroom runtime in sync.
        const nextProblem = aiStoreRef.current.main.problem;
        if (nextProblem?.id) {
          dispatch({ type: "SET_ACTIVE_PROBLEM", problemId: nextProblem.id });
        }

        // Optional code eval (deterministic) if orchestrator indicates.
        if (res.shouldRunCodeEval && nextProblem) {
          const evalResult = await evaluateUserCodeJS({ userCode: classroomState.code, problem: nextProblem });
          setLastEval(evalResult);
          aiDispatch({ type: "SECONDARY/SET_CODE_EVAL", result: evalResult });
        }

        if (res.aiMessage) {
          pushTurn({
            role: "ai",
            text: res.aiMessage,
            meta: {
              phase: aiStoreRef.current.main.phase,
              actionType: "ARCH_STEP",
              reason
            }
          });
        }

        if (res.shouldEnd) {
          dispatch({ type: "END_SESSION" });
          // Generate feedback at end
          try {
            const fb = await generateStructuredFeedback({
              interview: interviewRef.current,
              transcript: useTranscript,
              userCode: classroomState.code,
              lastCodeEval: lastEvalRef.current
            });
            setFeedback(fb);
            setInterview((prev: InterviewState) => ({ ...prev, phase: "ended", feedback: fb }));
          } catch (e) {
            setFeedback({
              rubric: {
                problemUnderstanding: 1,
                approachQuality: 1,
                codeCorrectness: 1,
                communication: 1,
                notes: ["Error generating feedback: " + (e instanceof Error ? e.message : String(e))]
              },
              summary: "Could not generate feedback due to an error."
            });
          }
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
    const CHECK_EVERY_MS = 2000;
    const INACTIVITY_MS = 90_000;
    const CODING_TOO_LONG_MS = 8 * 60_000;
    const SOFT_SESSION_MS = 25 * 60_000;
    const HARD_SESSION_MS = 35 * 60_000;
    const TIMER_COOLDOWN_MS = 60_000;

    const id = window.setInterval(() => {
      if (feedback || interviewRef.current.phase === "ended") return;
      // inFlightRef guards overlap; also avoid scheduling during user-visible think
      if (inFlightRef.current) return;

      const now = Date.now();
      elapsedMsRef.current = now - startedAtRef.current;

      // Hard stop (only once)
      if (!timerFlagsRef.current.hardStopped && elapsedMsRef.current >= HARD_SESSION_MS) {
        timerFlagsRef.current.hardStopped = true;
        void runArchitectureStep("timer", { userInput: "[TIMER_HARD_STOP]" });
        return;
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
