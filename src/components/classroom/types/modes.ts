import type { SessionType } from "../runtime/types";

export type ClassroomMode = "standard" | "ai-interviewer";

export interface ClassroomSessionConfig {
  name: string;
  type: SessionType;
  mode: ClassroomMode;
}
