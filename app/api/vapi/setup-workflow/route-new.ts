import { vapi } from "@/lib/vapi";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const workflow = await vapi.workflows.create({
      name: "Interview Info Collection",
      nodes: [
        {
          id: "start",
          type: "conversation",
          firstMessage: "Hi! I'm here to prepare your interview. Let's begin.",
          systemPrompt:
            "Ask the user for interview type, role, level, techstack, number of questions, and user ID.",
          extractVariables: [
            { name: "type", type: "string" },
            { name: "role", type: "string" },
            { name: "level", type: "string" },
            { name: "techstack", type: "string" },
            { name: "amount", type: "string" },
            { name: "userid", type: "string" },
          ],
        },
        {
          id: "end",
          type: "endCall",
          firstMessage: "Thanks! We will now prepare your interview questions.",
        },
      ],
      edges: [{ from: "start", to: "end" }],
    });

    return NextResponse.json({ success: true, workflowId: workflow.id });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
