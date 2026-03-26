import { ClassroomProvider } from "../runtime/ClassroomContext";
import { AiInterviewerClassroom } from "../modes/ai-interviewer/AiInterviewerClassroom";
import { StandardClassroom } from "../modes/standard/StandardClassroom";
import type { ClassroomSessionConfig } from "../types/modes";

interface ClassroomExperienceProps {
  session: ClassroomSessionConfig;
  onEndSession: () => void;
}

export function ClassroomExperience({ session, onEndSession }: ClassroomExperienceProps) {
  return (
    <ClassroomProvider participantName={session.name} sessionType={session.type}>
      {session.mode === "ai-interviewer" ? (
        <AiInterviewerClassroom onEndSession={onEndSession} />
      ) : (
        <StandardClassroom onEndSession={onEndSession} />
      )}
    </ClassroomProvider>
  );
}
