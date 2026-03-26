import type { ToolType as DomainToolType } from "@/lib/tools.domain";

export interface ToolComponentProps {
  sessionId: string;
  toolId: DomainToolType;
  isActive: boolean;
  isSplitView?: boolean;
}

export interface ToolMetadata {
  type: DomainToolType;
  title: string;
  description: string;
  color: string;
}
