import { ClassroomShell } from "../../ui/ClassroomShell";

interface StandardClassroomProps {
  onEndSession: () => void;
}

export function StandardClassroom({ onEndSession }: StandardClassroomProps) {
  return <ClassroomShell onEndSession={onEndSession} />;
}
