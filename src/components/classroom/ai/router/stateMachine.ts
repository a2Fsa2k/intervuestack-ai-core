export type RouterStateId =
  | "greeting_init"
  | "collect_topic"
  | "problem_introduced"
  | "approach_discussion"
  | "coding"
  | "coding_progressing"
  | "coding_check_in"
  | "stuck_coding"
  | "code_review"
  | "wrapup";

export type RouterAgentId =
  | "persona"
  | "question_bank"
  | "evaluator"
  | "hint"
  | "code_monitor"
  | "time_manager";

export type TransitionConditionId =
  | "userResponded"
  | "userSaysReady"
  | "userGivesUp"
  | "userAsksQuestion"
  | "idle_60s"
  | "idle_120s"
  | "mentions_topic";

export interface StateTransition {
  to: RouterStateId;
  when: TransitionConditionId;
  // optional keyword set for keyword-based transitions
  keywords?: string[];
}

export interface RouterStateConfig {
  id: RouterStateId;
  ai_goal: string;
  agents_active: RouterAgentId[];
  transitions: StateTransition[];
}

export const ROUTER_STATES: Record<RouterStateId, RouterStateConfig> = {
  greeting_init: {
    id: "greeting_init",
    ai_goal: "Welcome the candidate and ask what topic they want to practice (arrays/strings/graphs/dp) and the difficulty.",
    agents_active: ["persona"],
    transitions: [{ to: "collect_topic", when: "userResponded" }]
  },

  collect_topic: {
    id: "collect_topic",
    ai_goal: "Collect a topic (and optionally difficulty). Then introduce a problem.",
    agents_active: ["persona", "question_bank"],
    transitions: [
      { to: "problem_introduced", when: "mentions_topic" },
      { to: "problem_introduced", when: "userSaysReady" },
      { to: "collect_topic", when: "userAsksQuestion" }
    ]
  },

  problem_introduced: {
    id: "problem_introduced",
    ai_goal: "Present the chosen problem and confirm understanding + constraints.",
    agents_active: ["persona", "question_bank"],
    transitions: [
      { to: "approach_discussion", when: "userResponded" },
      { to: "approach_discussion", when: "userSaysReady" }
    ]
  },

  approach_discussion: {
    id: "approach_discussion",
    ai_goal: "Discuss the approach, complexity, and edge cases. When ready, instruct to start coding.",
    agents_active: ["persona", "question_bank", "evaluator"],
    transitions: [
      { to: "coding", when: "userSaysReady" },
      { to: "coding", when: "userResponded", keywords: ["i'll code", "let's code", "start coding", "i will implement"] }
    ]
  },

  coding: {
    id: "coding",
    ai_goal: "Candidate is coding. Do not call the LLM. Monitor silently and manage time.",
    agents_active: ["code_monitor", "time_manager"],
    transitions: [
      { to: "stuck_coding", when: "idle_120s" },
      { to: "code_review", when: "userSaysReady" }
    ]
  },

  coding_progressing: {
    id: "coding_progressing",
    ai_goal: "Candidate is making progress. Encourage and probe gently.",
    agents_active: ["persona"],
    transitions: [
      { to: "coding", when: "userResponded" },
      { to: "stuck_coding", when: "idle_120s" }
    ]
  },

  coding_check_in: {
    id: "coding_check_in",
    ai_goal: "Gently check in when candidate is idle during coding",
    agents_active: ["persona"],
    transitions: [
      { to: "coding", when: "userResponded" },
      { to: "stuck_coding", when: "userGivesUp" }
    ]
  },

  stuck_coding: {
    id: "stuck_coding",
    ai_goal: "Candidate appears stuck. Provide a small hint and get them moving again.",
    agents_active: ["persona", "hint", "question_bank"],
    transitions: [
      { to: "coding", when: "userResponded" },
      { to: "code_review", when: "userSaysReady" }
    ]
  },

  code_review: {
    id: "code_review",
    ai_goal: "Evaluate the solution (tests/correctness) and discuss improvements briefly.",
    agents_active: ["persona", "evaluator", "question_bank"],
    transitions: [
      { to: "wrapup", when: "userResponded" },
      { to: "wrapup", when: "userSaysReady" }
    ]
  },

  wrapup: {
    id: "wrapup",
    ai_goal: "Wrap up, summarize performance, and offer next steps.",
    agents_active: ["persona"],
    transitions: [{ to: "wrapup", when: "userResponded" }]
  }
};
