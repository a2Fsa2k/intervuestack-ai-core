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

### Contribution Rules

- Keep mode-specific logic in `modes/ai-interviewer` unless both modes need it.
- Prefer extending existing shared components over duplicate implementations.
- Keep runtime logic in `runtime` and UI concerns in `ui`.
- Register any new tool in `tools/registry.tsx`.

---

<div align="center">

**Built for IntervueStack contributors**

</div>
