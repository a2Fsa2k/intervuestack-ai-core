import { useClassroomContext } from "../runtime/ClassroomContext";
import { Layout } from "./Layout";

interface ClassroomShellProps {
  onEndSession: () => void;
}

export function ClassroomShell({ onEndSession }: ClassroomShellProps) {
  const { dispatch } = useClassroomContext();

  return (
    <Layout
      onLeave={() => {
        dispatch({ type: "END_SESSION" });
        onEndSession();
      }}
    />
  );
}
