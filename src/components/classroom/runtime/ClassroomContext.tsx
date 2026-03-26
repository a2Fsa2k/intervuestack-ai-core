import { createContext, useContext, useMemo, useReducer } from "react";
import {
  classroomMachineReducer,
  createInitialClassroomState,
  type ClassroomEvent
} from "./classroomMachine";
import type { ClassroomRuntimeState, SessionType } from "./types";

interface ClassroomContextValue {
  state: ClassroomRuntimeState;
  dispatch: React.Dispatch<ClassroomEvent>;
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

interface ClassroomProviderProps {
  participantName: string;
  sessionType: SessionType;
  children: React.ReactNode;
}

export function ClassroomProvider({
  participantName,
  sessionType,
  children
}: ClassroomProviderProps) {
  const [state, dispatch] = useReducer(
    classroomMachineReducer,
    createInitialClassroomState(participantName, sessionType)
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ClassroomContext.Provider value={value}>{children}</ClassroomContext.Provider>;
}

export function useClassroomContext() {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error("useClassroomContext must be used inside ClassroomProvider");
  }
  return context;
}
