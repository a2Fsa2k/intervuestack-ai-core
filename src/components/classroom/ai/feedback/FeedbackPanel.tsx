import React from "react";
import type { StructuredFeedback } from "./feedbackGenerator";

interface FeedbackPanelProps {
  feedback: StructuredFeedback;
}

export function FeedbackPanel({ feedback }: FeedbackPanelProps) {
  return (
    <div className="p-4 bg-[#101010] border border-[#222] rounded-lg text-white max-w-xl mx-auto mt-8">
      <h2 className="text-lg font-bold mb-2 text-green-400">Interview Feedback</h2>
      <div className="mb-4">
        <div className="flex gap-4 mb-2">
          <div>
            <span className="font-semibold">Problem Understanding:</span> <span>{feedback.rubric.problemUnderstanding}/5</span>
          </div>
          <div>
            <span className="font-semibold">Approach Quality:</span> <span>{feedback.rubric.approachQuality}/5</span>
          </div>
        </div>
        <div className="flex gap-4 mb-2">
          <div>
            <span className="font-semibold">Code Correctness:</span> <span>{feedback.rubric.codeCorrectness}/5</span>
          </div>
          <div>
            <span className="font-semibold">Communication:</span> <span>{feedback.rubric.communication}/5</span>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <span className="font-semibold">Summary:</span>
        <div className="mt-1 text-gray-200">{feedback.summary}</div>
      </div>
      <div>
        <span className="font-semibold">Notes:</span>
        <ul className="list-disc ml-6 mt-1 text-gray-300">
          {feedback.rubric.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
