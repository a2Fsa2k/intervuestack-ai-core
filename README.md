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

`IntervueStack-AI-Core` is an isolated development environment for the IntervueStack classroom experience, focused on AI interviewer workflows.

It mirrors the classroom structure closely so contributors can build AI-specific behavior safely, then integrate back into the main product with minimal friction.

This project keeps the classroom architecture modular: setup, runtime state, UI shell, tools, and mode-specific composition are separated so new behavior can be added without rewriting the full flow.

---

## Quick Start

```bash
cd IntervueStack-AI-Core
npm install
npm run dev
```

Build:

```bash
npm run build
```

---

## Project Structure

```text
IntervueStack-AI-Core/
  public/
    logo.svg
  src/
    components/
      classroom/
        composition/
          ClassroomExperience.tsx
        modes/
          ai-interviewer/
            AiInterviewerClassroom.tsx
          standard/
            StandardClassroom.tsx
        runtime/
          ClassroomContext.tsx
          classroomMachine.ts
          types.ts
        setup/
          SessionSetup.tsx
        tools/
          code/
            CodeTool.tsx
          whiteboard/
            WhiteboardTool.tsx
          core/
            ToolTypes.ts
            ToolProvider.tsx
          registry.tsx
        ui/
          ClassroomShell.tsx
          Layout.tsx
          ControlsBar.tsx
          Panels/
            ToolPanel.tsx
            VideoPanel.tsx
            ChatPanel.tsx
          ToolsPanel.tsx
        types/
          modes.ts
        index.ts
    App.tsx
    main.tsx
```

---

## Architecture Flow

1. `main.tsx` mounts the app and global styles.
2. `App.tsx` initializes the classroom entry flow.
3. `SessionSetup.tsx` collects participant details and session type.
4. `ClassroomExperience.tsx` creates and wires classroom runtime context.
5. Mode components (`ai-interviewer` / `standard`) compose shared UI with mode-specific behavior.
6. Tool registry mounts the active tool (`CodeTool` or `WhiteboardTool`) inside shared panels.

---

## Component Responsibilities

### Entry and Composition

- `src/App.tsx`  
  Main application entry for routing between setup and classroom experience.

- `src/components/classroom/setup/SessionSetup.tsx`  
  Captures user name and session metadata before entering the classroom.

- `src/components/classroom/composition/ClassroomExperience.tsx`  
  Root composition layer that selects mode, initializes providers, and renders the classroom shell.

### Modes

- `src/components/classroom/modes/ai-interviewer/AiInterviewerClassroom.tsx`  
  AI interviewer-focused classroom composition. Uses shared layout with AI-specific panel behavior.

- `src/components/classroom/modes/standard/StandardClassroom.tsx`  
  Baseline classroom composition used as a compatibility and comparison layer.

### Runtime and State

- `src/components/classroom/runtime/types.ts`  
  Core state and action type definitions used across runtime and UI.

- `src/components/classroom/runtime/classroomMachine.ts`  
  State transition logic (reducer-style machine) for classroom interactions.

- `src/components/classroom/runtime/ClassroomContext.tsx`  
  Context provider/hooks exposing classroom state and dispatch to all child components.

### Shared UI Shell

- `src/components/classroom/ui/ClassroomShell.tsx`  
  Top-level classroom shell that assembles header, body, and controls.

- `src/components/classroom/ui/Layout.tsx`  
  Grid and responsive layout primitives for panel placement.

- `src/components/classroom/ui/ControlsBar.tsx`  
  Bottom interaction controls (for current scope, primarily leave/session controls).

- `src/components/classroom/ui/ToolsPanel.tsx`  
  Wrapper around active tool panel and associated tool-area UI.

- `src/components/classroom/ui/Panels/ToolPanel.tsx`  
  Container for rendering whichever tool is currently active.

- `src/components/classroom/ui/Panels/VideoPanel.tsx`  
  Compact AI interviewer panel area with transcript section below.

- `src/components/classroom/ui/Panels/ChatPanel.tsx`  
  Conversation/chat display area where relevant for mode behavior.

### Tools

- `src/components/classroom/tools/registry.tsx`  
  Central tool map for resolving and rendering tools by key.

- `src/components/classroom/tools/core/ToolTypes.ts`  
  Shared interfaces and contracts for tool implementation.

- `src/components/classroom/tools/core/ToolProvider.tsx`  
  Tool-level provider state and helper hooks used by tool components.

- `src/components/classroom/tools/code/CodeTool.tsx`  
  Monaco-based coding environment with language/runtime controls and execution output area.

- `src/components/classroom/tools/whiteboard/WhiteboardTool.tsx`  
  tldraw-powered whiteboard surface configured for classroom collaboration flow.

### Public Classroom API

- `src/components/classroom/types/modes.ts`  
  Mode and session-level type contracts used across composition/runtime layers.

- `src/components/classroom/index.ts`  
  Barrel export for classroom modules; preferred import surface for new integrations.

---

## Contributor Guide

### Where to Add New Work

- **AI-specific behavior**: `src/components/classroom/modes/ai-interviewer/`
- **Shared classroom layout/UI**: `src/components/classroom/ui/`
- **State and transitions**: `src/components/classroom/runtime/`
- **Tool behavior (code/whiteboard)**: `src/components/classroom/tools/`

### Architecture Notes

- `ClassroomExperience.tsx` is the composition root (mode selection + provider wiring).
- `SessionSetup.tsx` is the entry form for classroom start.
- `index.ts` is the public export surface of the classroom module.
- `classroomMachine.ts` should remain the source of truth for state transitions.
- `tools/registry.tsx` should be updated whenever a new tool is introduced.

### Contribution Rules

- Keep mode-specific logic in `modes/ai-interviewer` unless both modes need it.
- Prefer extending existing shared components over duplicate implementations.
- Keep runtime logic in `runtime` and UI concerns in `ui`.
- Register any new tool in `tools/registry.tsx`.
- Add or update related types before wiring new runtime or UI behavior.

---

<div align="center">

**Built for IntervueStack contributors**

</div>
