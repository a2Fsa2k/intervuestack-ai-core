import type { ToolType as DomainToolType } from "@/lib/tools.domain";
import type { ClassroomRuntimeState, SessionType, ToolType } from "./types";

export type ClassroomEvent =
  | { type: "SET_ACTIVE_TOOL"; tool: ToolType }
  | { type: "OPEN_TOOL"; tool: DomainToolType }
  | { type: "CLOSE_TOOL"; tool: DomainToolType }
  | { type: "UPDATE_CODE"; code: string }
  | { type: "END_SESSION" };

export function createInitialClassroomState(
  participantName: string,
  sessionType: SessionType
): ClassroomRuntimeState {
  return {
    status: "active",
    participant: { name: participantName.trim() },
    sessionType,
    activeTool: sessionType === "dsa" ? "code_editor" : "whiteboard",
    openTools: sessionType === "dsa" ? ["code_editor"] : ["whiteboard"],
    code:
      sessionType === "dsa"
        ? "// Solve your DSA problem here\nfunction solve() {\n  return null;\n}\n"
        : "// Add technical notes if needed\n"
  };
}

export function classroomMachineReducer(
  state: ClassroomRuntimeState,
  event: ClassroomEvent
): ClassroomRuntimeState {
  switch (event.type) {
    case "SET_ACTIVE_TOOL":
      return { ...state, activeTool: event.tool };
    case "OPEN_TOOL": {
      const isOpen = state.openTools.includes(event.tool);
      return {
        ...state,
        openTools: isOpen ? state.openTools : [...state.openTools, event.tool],
        activeTool: event.tool
      };
    }
    case "CLOSE_TOOL": {
      const nextOpenTools = state.openTools.filter((tool) => tool !== event.tool);
      if (nextOpenTools.length === 0) {
        return { ...state, openTools: [], activeTool: null };
      }
      return {
        ...state,
        openTools: nextOpenTools,
        activeTool: state.activeTool === event.tool ? nextOpenTools[nextOpenTools.length - 1] : state.activeTool
      };
    }
    case "UPDATE_CODE":
      return { ...state, code: event.code };
    case "END_SESSION":
      return { ...state, status: "ended" };
    default:
      return state;
  }
}
