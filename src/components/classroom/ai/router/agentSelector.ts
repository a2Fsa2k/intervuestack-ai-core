import type { RouterAgentId, RouterStateId } from "./stateMachine";
import { ROUTER_STATES } from "./stateMachine";

export function selectAgents(stateId: RouterStateId): RouterAgentId[] {
  const cfg = ROUTER_STATES[stateId];
  if (!cfg) return [];
  // Strictly enforce: ONLY agents declared for the state.
  return [...cfg.agents_active];
}
