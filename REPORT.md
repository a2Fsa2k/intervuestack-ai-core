# IntervueStack-AI-Core: AI DSA Interviewer System

## System Design Overview

The system is a modular, extensible AI interviewer for DSA (Data Structures & Algorithms) mock interviews. It simulates a realistic 30–45 minute technical interview, maintains context, guides the flow, analyzes code, and generates structured feedback. The user interacts via voice, and all interactions are logged in a visible transcript.

## Architecture

```
+-------------------+      +-------------------+      +-------------------+
|  Orchestrator     |<---->|  Code Analysis    |<---->|  Problem Bank     |
|  (LLM-driven)     |      |  Agent            |      |  (DSA Problems)   |
+-------------------+      +-------------------+      +-------------------+
        |                        ^
        v                        |
+-------------------+      +-------------------+
|  Interaction      |<---->|  Transcript/      |
|  Agent            |      |  Session State    |
+-------------------+      +-------------------+
        |
        v
+-------------------+
|  UI (React/TS)    |
+-------------------+
```

- **Orchestrator:** Drives the interview using Gemini LLM, maintains context, and decides next actions.
- **Code Analysis Agent:** Evaluates user code in-browser (JS/TS), runs real test cases, and provides results to the orchestrator.
- **Interaction Agent:** Handles user input (voice via ElevenLabs STT), manages transcript, and synchronizes with the UI.
- **Transcript System:** Logs all user/AI turns, visible in the UI, and used for context.
- **Problem Bank:** Supplies DSA problems and test cases.
- **UI:** Monaco code editor, transcript panel, feedback panel, and controls.

## Key Architectural Decisions

- **Modularity:** Each agent (orchestrator, code analysis, interaction) is a separate module for extensibility and maintainability.
- **LLM Integration:** Gemini API is used for realistic interviewer behavior, with robust JSON parsing and error handling.
- **Voice Input:** ElevenLabs STT (via local Express proxy) ensures reliable speech-to-text, with transcript always visible.
- **Real Code Evaluation:** User code is executed and tested in-browser for JS/TS, with results fed back to the AI.
- **Session State:** All state (problem, code, transcript, feedback) is managed reactively and contextually.
- **Feedback Generation:** At session end, structured feedback (problem understanding, approach, code correctness, communication) is generated and shown.
- **UI/UX:** Clean, minimal, and robust. No redundant controls. Feedback replaces transcript at session end.

## How the AI Interviewer Works

1. **Session Start:**
   - User is greeted and asked for topic/difficulty preferences (voice input).
   - Orchestrator selects a problem and presents it.
2. **Interview Flow:**
   - User interacts via voice; transcript is updated live.
   - User codes in Monaco editor; code is evaluated on demand.
   - Orchestrator guides the session: clarifications, approach, coding, testing, optimization, wrap-up.
   - All context (transcript, code, test results) is used for LLM prompts.
3. **Session End:**
   - When the interview is finished, the system auto-generates structured feedback and displays it in the UI.
   - Feedback covers problem understanding, approach quality, code correctness, communication, and notes.

## Example ASCII Flow

```
User (voice) ---> [Interaction Agent] ---> [Transcript]
      |                                         |
      v                                         v
[Monaco Editor] <--- [Code Analysis] <--- [Orchestrator (LLM)]
      |                                         |
      v                                         v
   [UI] <--------------------------------- [Feedback]
```

## Setup & Usage

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd IntervueStack-AI-Core
   npm install
   ```
2. Add your API keys to `.env.local` (see sample in repo).
3. Start the dev environment:
   ```bash
   npm run dev
   # (and in another terminal)
   npm run stt-server
   ```
4. Open the app in your browser, start a session, and interact via voice/code.

## Limitations & Future Work
- Only JS/TS code is supported for in-browser evaluation.
- More DSA problems and advanced interviewer behaviors can be added.
- UI/UX can be further polished.
