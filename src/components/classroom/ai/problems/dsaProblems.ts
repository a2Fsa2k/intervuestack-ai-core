import type { InterviewProblem } from "../types";

export const DSA_PROBLEMS: InterviewProblem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    topicTags: ["arrays", "hashmap"],
    prompt:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    constraints: [
      "2 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9"
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "nums[0] + nums[1] = 2 + 7 = 9"
      }
    ],
    starterCode:
      "// Implement twoSum(nums, target)\n// Return an array with the two indices.\nfunction twoSum(nums, target) {\n  // TODO\n  return [];\n}\n",
    evaluation: {
      functionName: "twoSum",
      tests: [
        { name: "basic", input: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { name: "with negatives", input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
        { name: "zeros", input: [[0, 4, 3, 0], 0], expected: [0, 3] }
      ]
    }
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    topicTags: ["strings", "sliding window"],
    prompt:
      "Given a string s, find the length of the longest substring without repeating characters.",
    constraints: ["0 <= s.length <= 10^5"],
    examples: [
      { input: "s = 'abcabcbb'", output: "3", explanation: "The answer is 'abc'" },
      { input: "s = 'bbbbb'", output: "1", explanation: "The answer is 'b'" }
    ],
    starterCode:
      "// Implement lengthOfLongestSubstring(s)\nfunction lengthOfLongestSubstring(s) {\n  // TODO\n  return 0;\n}\n",
    evaluation: {
      functionName: "lengthOfLongestSubstring",
      tests: [
        { name: "example1", input: ["abcabcbb"], expected: 3 },
        { name: "example2", input: ["bbbbb"], expected: 1 },
        { name: "empty", input: [""], expected: 0 },
        { name: "pwwkew", input: ["pwwkew"], expected: 3 }
      ]
    }
  }
];

export function pickProblemByTopic(preferredTopic?: string): InterviewProblem {
  const topic = (preferredTopic ?? "").toLowerCase();
  const pool = topic
    ? DSA_PROBLEMS.filter((p) => p.topicTags.some((t) => t.includes(topic)))
    : DSA_PROBLEMS;
  return (pool.length ? pool : DSA_PROBLEMS)[Math.floor(Math.random() * (pool.length ? pool.length : DSA_PROBLEMS.length))];
}
