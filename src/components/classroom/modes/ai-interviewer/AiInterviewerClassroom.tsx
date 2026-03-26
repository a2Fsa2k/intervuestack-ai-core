import { ClassroomShell } from "../../ui/ClassroomShell";

interface AiInterviewerClassroomProps {
  onEndSession: () => void;
}

/**
 * AI-specific behavior should be implemented in this mode folder:
 * prompts, transcript adapters, evaluation pipeline, and orchestration.
 */
export function AiInterviewerClassroom({ onEndSession }: AiInterviewerClassroomProps) {
  return <ClassroomShell onEndSession={onEndSession} />;
}
