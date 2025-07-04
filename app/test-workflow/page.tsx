"use client";

import { useState } from "react";
import Agent from "@/components/Agent";

export default function TestWorkflowPage() {
  const [mode, setMode] = useState<"assistant" | "workflow">("workflow");
  const [type, setType] = useState<"generate" | "interview">("generate");

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          VAPI Workflow Test
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Mode</label>
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "assistant" | "workflow")
                }
                className="w-full p-2 border rounded"
              >
                <option value="assistant">Assistant Mode</option>
                <option value="workflow">Workflow Mode</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "generate" | "interview")
                }
                className="w-full p-2 border rounded"
              >
                <option value="generate">Generate (Data Collection)</option>
                <option value="interview">Interview (Q&A)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">Current Settings:</h3>
            <ul className="text-sm space-y-1">
              <li>
                <strong>Mode:</strong> {mode}
              </li>
              <li>
                <strong>Type:</strong> {type}
              </li>
              <li>
                <strong>Expected Behavior:</strong>{" "}
                {type === "generate"
                  ? "Collect user preferences for interview questions"
                  : "Conduct interview with pre-defined questions"}
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Agent Test</h2>
          <Agent
            userName="Test User"
            userId="test-user-123"
            interviewId="test-interview-123"
            feedbackId="test-feedback-123"
            type={type}
            mode={mode}
            phoneNumber="+1234567890"
            questions={
              type === "interview"
                ? [
                    "What is your experience with JavaScript?",
                    "How do you handle async operations?",
                    "Describe a challenging project you worked on.",
                  ]
                : undefined
            }
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">
                For Generate Mode (Data Collection):
              </h3>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Click "Start Interview Setup"</li>
                <li>Wait for the workflow to be created</li>
                <li>The assistant should ask about interview preferences</li>
                <li>
                  Answer questions about type, role, level, tech stack, and
                  number of questions
                </li>
                <li>
                  The system should extract your answers and generate
                  personalized questions
                </li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium">For Interview Mode:</h3>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Click "Start Interview"</li>
                <li>The assistant should ask the pre-defined questions</li>
                <li>Answer the questions naturally</li>
                <li>The system should provide feedback at the end</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium">Debugging:</h3>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Check browser console for detailed logs</li>
                <li>Use "Debug Workflow" button to test API connections</li>
                <li>Verify environment variables are set correctly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
