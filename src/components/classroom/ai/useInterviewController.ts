import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassroomContext } from "../runtime/ClassroomContext";
import type { CodeEvalResult, InterviewState, TranscriptTurn } from "./types";
import { createInitialInterviewState, nextAction } from "./orchestrator";
import { evaluateUserCodeJS } from "./codeEval";
import { generateStructuredFeedback } from "./feedback/feedbackGenerator";

function uuid() {
  return crypto.randomUUID();
}

export function useInterviewController() {
  const { state: classroomState, dispatch } = useClassroomContext();

  const [interview, setInterview] = useState<InterviewState>(() => createInitialInterviewState());
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastEval, setLastEval] = useState<CodeEvalResult | null>(null);
  const [feedback, setFeedback] = useState<import("./feedback/feedbackGenerator").StructuredFeedback | null>(null);

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
    setTranscript((prev) => [...prev, next]);
    return next;
  }, []);

  const runOneStep = useCallback(async (override?: { transcript?: TranscriptTurn[]; interview?: InterviewState }) => {
    setIsThinking(true);
    try {
      const useTranscript = override?.transcript ?? transcriptRef.current;
      const useInterview = override?.interview ?? interviewRef.current;
      const useLastEval = lastEvalRef.current;

      const { interview: nextInterview, action, maybeProblemStarterCode } = await nextAction({
        interview: useInterview,
        transcript: useTranscript,
        userCode: classroomState.code,
        lastCodeEval: useLastEval
      });

      setInterview(nextInterview);

      if (nextInterview.problem?.id) {
        dispatch({ type: "SET_ACTIVE_PROBLEM", problemId: nextInterview.problem.id });
      }

      if (maybeProblemStarterCode) {
        dispatch({ type: "UPDATE_CODE", code: maybeProblemStarterCode });
      }

      let evalResult: CodeEvalResult | null = useLastEval;
      if (action.shouldRunCodeEval && nextInterview.problem) {
        evalResult = await evaluateUserCodeJS({
          userCode: classroomState.code,
          problem: nextInterview.problem
        });
        setLastEval(evalResult);
      }

      pushTurn({
        role: "ai",
        text: action.message,
        meta: {
          phase: action.phase ?? nextInterview.phase,
          codeEval: evalResult ?? null,
          actionType: action.type
        }
      });

      if (action.type === "END_SESSION") {
        dispatch({ type: "END_SESSION" });
        // Generate feedback at end of session
        try {
          const fb = await generateStructuredFeedback({
            interview: nextInterview,
            transcript: useTranscript,
            userCode: classroomState.code,
            lastCodeEval: evalResult
          });
          setFeedback(fb);
          setInterview((prev) => ({ ...prev, feedback: fb }));
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
      pushTurn({
        role: "system",
        text: `AI error: ${e instanceof Error ? e.message : String(e)}`
      });
    } finally {
      setIsThinking(false);
    }
  }, [classroomState.code, dispatch, pushTurn]);

  const sendUserText = useCallback(async (text: string) => {
    const userTurn: TranscriptTurn = { id: uuid(), timestamp: Date.now(), role: "user", text };

    // Update interview topic immediately (avoid relying on async setState ordering)
    let nextInterview = interviewRef.current;
    if (nextInterview.phase === "context") {
      const lowered = text.toLowerCase();
      const topics = ["arrays", "strings", "graphs", "dp", "dynamic programming", "sliding window", "hashmap"];
      const hit = topics.find((t) => lowered.includes(t));
      if (hit) {
        nextInterview = { ...nextInterview, selectedTopic: hit.includes("dynamic") ? "dp" : hit };
        setInterview(nextInterview);
      }
    }

    const nextTranscript = [...transcriptRef.current, userTurn];
    setTranscript(nextTranscript);

    await runOneStep({ transcript: nextTranscript, interview: nextInterview });
  }, [runOneStep]);

  // Auto-start: first AI turn.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void runOneStep();
  }, [runOneStep]);

  useEffect(() => {
    function handleEndSession() {
      // Only end if not already ended
      if (!feedback && interviewRef.current.phase !== "ended") {
        // Simulate END_SESSION orchestrator action
        runOneStep({
          interview: { ...interviewRef.current, phase: "ended" },
          transcript: transcriptRef.current
        });
      }
    }
    window.addEventListener("intervue:endSession", handleEndSession);
    return () => window.removeEventListener("intervue:endSession", handleEndSession);
  }, [feedback, runOneStep]);

  const transcriptTextForDebug = useMemo(
    () => transcript.map((t) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.role}: ${t.text}`).join("\n"),
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
