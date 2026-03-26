import { createContext, useContext } from "react";

const ToolContext = createContext<boolean>(false);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  return <ToolContext.Provider value={true}>{children}</ToolContext.Provider>;
}

export function useToolContext() {
  return useContext(ToolContext);
}
