import { useState } from "react";
import {
  ClassroomExperience,
  SessionSetup,
  type ClassroomSessionConfig
} from "@/components/classroom";

export default function App() {
  const [sessionConfig, setSessionConfig] = useState<ClassroomSessionConfig | null>(null);

  if (!sessionConfig) {
    return <SessionSetup onStart={setSessionConfig} />;
  }

  return <ClassroomExperience session={sessionConfig} onEndSession={() => setSessionConfig(null)} />;
}
