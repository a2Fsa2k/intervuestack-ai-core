import type { ToolType as DomainToolType } from "@/lib/tools.domain";
export type SessionType = "dsa" | "system-design";
export type ToolType = DomainToolType | null;
export type ClassroomState = "idle" | "active" | "ended";

export interface Participant {
  name: string;
}

export interface ClassroomRuntimeState {
  status: ClassroomState;
  participant: Participant;
  sessionType: SessionType;
  activeTool: ToolType;
  openTools: DomainToolType[];
  code: string;
}
