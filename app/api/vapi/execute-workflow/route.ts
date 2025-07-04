import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, message: "Missing questions" },
        { status: 400 }
      );
    }

    console.log(
      "Creating interview execution workflow for questions:",
      questions
    );

    const serverToken = process.env.VAPI_SERVER_TOKEN;
    if (!serverToken) {
      throw new Error("VAPI_SERVER_TOKEN environment variable not set");
    }

    // Create nodes for each question
    const nodes: any[] = questions.map((q: string, i: number) => ({
      id: `q${i}`,
      type: "conversation",
      firstMessage: `Question ${i + 1}: ${q}`,
      systemPrompt: `Ask this interview question and wait for the user's response. Be encouraging and professional. After they answer, thank them and move to the next question.`,
    }));

    // Add end node
    nodes.push({
      id: "end",
      type: "endCall",
      firstMessage:
        "That completes your interview! Thank you for your time. You did great! Your feedback will be generated shortly.",
    });

    // Create edges to connect questions in sequence
    const edges = questions.map((_, i) => ({
      from: `q${i}`,
      to: i < questions.length - 1 ? `q${i + 1}` : "end",
    }));

    // Create workflow using direct HTTP API call
    const workflowResponse = await fetch("https://api.vapi.ai/workflow", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Interview Question Execution",
        nodes,
        edges,
      }),
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error("Workflow creation failed:", errorText);
      throw new Error(
        `Failed to create workflow: ${workflowResponse.status} ${errorText}`
      );
    }

    const workflow = await workflowResponse.json();
    console.log("Execution workflow created successfully:", workflow.id);

    return NextResponse.json({ success: true, workflowId: workflow.id });
  } catch (error) {
    console.error("Error creating execution workflow:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create execution workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
