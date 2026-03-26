import { useState } from "react";
import type { SessionType } from "../runtime/types";
import type { ClassroomSessionConfig } from "../types/modes";

interface SessionSetupProps {
  onStart: (config: ClassroomSessionConfig) => void;
}

export function SessionSetup({ onStart }: SessionSetupProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SessionType>("dsa");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
        padding: 16
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) {
            return;
          }
          onStart({ name: trimmed, type, mode: "ai-interviewer" });
        }}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 20,
          display: "grid",
          gap: 12
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>This is an AI-Interviewer Classroom</h1>
        <p style={{ margin: 0, color: "#64748b" }}>
          Enter your name, choose session type, and pick classroom mode.
        </p>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Session type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SessionType)}
            style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px" }}
          >
            <option value="dsa">DSA</option>
            <option value="system-design">System Design</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            border: "1px solid #2563eb",
            borderRadius: 8,
            background: "#2563eb",
            color: "#ffffff",
            padding: "10px 12px",
            cursor: "pointer",
            opacity: name.trim() ? 1 : 0.7
          }}
        >
          Join classroom
        </button>
      </form>
    </div>
  );
}
