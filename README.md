<div align="center">

<img src="./public/logo.svg" alt="IntervueStack Logo" width="80" height="80" />

# IntervueStack

## AI-Interviewer Classroom

**Standalone classroom workspace for building and validating AI interviewer flows**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF.svg)](https://vitejs.dev/)
[![Status](https://img.shields.io/badge/Status-Active%20Development-success.svg)](#)

</div>

---

## About

IntervueStack-AI-Core is an AI-powered DSA mock interviewer. It simulates a realistic 30-45 minute technical interview where an LLM-driven interviewer guides the candidate through a problem, the candidate codes in a Monaco editor, and the system evaluates the solution and generates structured feedback.

The architecture is modular — runtime state, UI shell, tools, and AI orchestration are separated so new behavior can be added without rewriting the full flow.

---

## Quick Start

```bash
cd IntervueStack-AI-Core
npm install
```

Create `.env.local` with:
```
VITE_OPENAI_API_KEY=sk-...
```

Start:
```bash
npm run dev
```

Build:
```bash
npm run build
```

---

## Project Structure

```
IntervueStack-AI-Core/
├── src/
│   ├── App.tsx                              # Entry: setup → classroom
│   ├── components/classroom/
│   │   ├── setup/SessionSetup.tsx            # Name + session type form
│   │   ├── composition/ClassroomExperience.tsx  # Provider + mode selector
│   │   ├── runtime/
│   │   │   ├── types.ts                     # Core state types
│   │   │   ├── classroomMachine.ts          # Reducer (tools, code, status)
│   │   │   └── ClassroomContext.tsx          # Context provider + hook
│   │   ├── modes/
│   │   │   ├── ai-interviewer/              # AI interviewer mode
│   │   │   └── standard/                    # Baseline mode
│   │   ├── ui/                              # Layout, shell, panels, controls
│   │   ├── tools/
│   │   │   ├── code/CodeTool.tsx            # Monaco editor with JS eval
│   │   │   └── whiteboard/WhiteboardTool.tsx # tldraw whiteboard
│   │   └── ai/                              # ← AI orchestration layer
│   │       ├── useInterviewController.ts    # Central controller
│   │       ├── openaiClient.ts              # OpenAI wrapper + JSON hardening
│   │       ├── router/                      # State machine router
│   │       │   ├── stateMachine.ts          # 10 states, transitions, agent configs
│   │       │   ├── classifier.ts            # Pure function: next state from signal
│   │       │   ├── runRouter.ts             # Step runner: classify → agents → LLM → parse
│   │       │   ├── promptBuilder.ts         # LLM prompt from state + store
│   │       │   └── parser.ts                # JSON extraction from LLM output
│   │       ├── architecture/store.ts        # Centralized AI state (main + secondary)
│   │       ├── architecture/agents/
│   │       │   ├── personaAgent.ts          # LLM → tone/style
│   │       │   ├── questionBankAgent.ts     # Deterministic problem selection
│   │       │   ├── evaluatorAgent.ts        # Code eval + scoring
│   │       │   ├── codeMonitorAgent.ts      # Deterministic: syntax, stuck, thrash detection
│   │       │   └── timeManager.ts           # Session time limits
│   │       ├── problems/dsaProblems.ts      # Problem bank (Two Sum, Longest Substring)
│   │       ├── feedback/                    # Post-interview feedback generation
│   │       ├── stt/                         # Whisper STT via browser
│   │       └── TranscriptPanel.tsx          # Chat UI + voice button
│   └── lib/
│       ├── utils.ts                         # cn() helper
│       └── tools.domain.ts                  # ToolType definitions
```

---

## Architecture Flow

```
User Input (voice/text)
        │
        ▼
useInterviewController  ← Code Monitor (deterministic, debounced)
        │                     Timer loop (5s interval)
        ▼
runRouterStep()
    ├── classify()           → Pure function: signal type → router state
    ├── selectAgents()       → Which agents to run for this state
    ├── runAgents()          → persona, question_bank, evaluator, time_manager
    ├── buildPromptSlots()   → Build LLM prompt from state + store + agent outputs
    ├── generateOpenAIJSON() → LLM call (gpt-4o-mini via OpenAI SDK)
    ├── parseRouterOutput()  → JSON extraction + validation
    └── applyTransition()    → Store updates + re-classify
        │
        ▼
    Transcript update + UI re-render
```

### Router State Machine

```
greeting_init → collect_topic → problem_introduced → approach_discussion → coding
                                                                   ↓
                                                          coding_progressing
                                                          coding_check_in
                                                          stuck_coding
                                                              ↓
                                                          code_review → wrapup
```

Each state declares:
- An `ai_goal` — what the interviewer should do
- `agents_active` — which deterministic agents run
- `transitions` — conditions to move to the next state

Transitions are evaluated by a pure `classify()` function — no LLM involved in state routing. The LLM only generates the interviewer's message.

---

## Key Features

- **Voice interaction** — Push-to-talk via MediaRecorder, transcribed by Whisper (`gpt-4o-mini-transcribe`)
- **Monaco code editor** — Multi-language, JS evaluation with real test execution
- **LLM-driven interviewer** — OpenAI `gpt-4o-mini` powers the orchestrator, persona, evaluator, and feedback
- **Deterministic code monitor** — Detects syntax errors, stuck progress, thrash rewrites without calling the LLM
- **Rolling transcript summary** — Compresses long sessions to prevent context bloat
- **Structured feedback** — Problem understanding, approach quality, code correctness, communication
- **Dark-themed UI** — Minimal, focused interface

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18, TypeScript 5.8 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 |
| LLM | OpenAI (`gpt-4o-mini`) |
| STT | OpenAI Whisper (`gpt-4o-mini-transcribe`) |
| Code editor | Monaco (@monaco-editor/react) |
| Whiteboard | tldraw |

---

<div align="center">

**Built for IntervueStack contributors**

</div>
