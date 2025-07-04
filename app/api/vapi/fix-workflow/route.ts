import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === "create-new-workflow") {
      return await createNewWorkflow();
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Fix workflow error:", error);
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

async function createNewWorkflow() {
  const serverToken = process.env.VAPI_SERVER_TOKEN;
  if (!serverToken) {
    throw new Error("VAPI_SERVER_TOKEN not found");
  }

  console.log("Creating new workflow with proper prompts...");

  const workflowConfig = {
    name: "Interview Setup Workflow - Fixed",
    nodes: [
      {
        name: "introduction",
        type: "conversation",
        isStart: true,
        model: {
          provider: "openai",
          model: "gpt-4o",
          maxTokens: 250,
          temperature: 0.3,
        },
        prompt:
          "You are an interview preparation assistant. Welcome the user and let them know you'll ask a few questions to create a personalized mock interview.",
        messagePlan: {
          firstMessage:
            "Hello! I'm here to help you prepare for your job interview. I'll ask you a few quick questions to create the perfect mock interview just for you. Are you ready to get started?",
        },
        metadata: {
          position: { x: -500, y: -2000 },
        },
      },
      {
        name: "collect_details",
        type: "conversation",
        model: {
          provider: "openai",
          model: "gpt-4o",
          maxTokens: 300,
          temperature: 0.3,
        },
        prompt: `You are an interview preparation assistant. Ask the user these questions one by one in a conversational manner:

1. "What job role or position are you preparing for?" 
2. "What type of interview would you like - Technical, Behavioral, or Mixed?"
3. "What's your experience level - Junior, Mid-level, or Senior?"
4. "What technologies or skills should we focus on? For example: React, Python, AWS, etc."
5. "How many questions would you like me to prepare? I can create between 3 to 10 questions."

Extract the exact values they provide and acknowledge each answer. Keep responses short and conversational.`,
        messagePlan: {
          firstMessage:
            "Great! Let's start with the first question. What job role or position are you preparing for?",
        },
        variableExtractionPlan: {
          output: [
            {
              type: "string",
              title: "role",
              description: "The job role or position they're preparing for",
            },
            {
              type: "string",
              title: "type",
              description:
                "The interview type: Technical, Behavioral, or Mixed",
            },
            {
              type: "string",
              title: "level",
              description: "Their experience level: Junior, Mid, or Senior",
            },
            {
              type: "string",
              title: "techstack",
              description: "The technologies or skills they want to focus on",
            },
            {
              type: "string",
              title: "amount",
              description: "The number of questions they want (3-10)",
            },
          ],
        },
        metadata: {
          position: { x: -200, y: -1700 },
        },
      },
      {
        name: "confirm_details",
        type: "conversation",
        model: {
          provider: "openai",
          model: "gpt-4o",
          maxTokens: 200,
          temperature: 0.3,
        },
        prompt:
          "Confirm the user's inputs and let them know you're generating their personalized interview questions.",
        messagePlan: {
          firstMessage:
            "Perfect! Let me confirm: You're preparing for a {{type}} interview for a {{role}} position at {{level}} level, focusing on {{techstack}}. I'll create {{amount}} questions for you. Generating your personalized interview now...",
        },
        metadata: {
          position: { x: -200, y: -1400 },
        },
      },
      {
        name: "generate_questions",
        type: "tool",
        tool: {
          type: "apiRequest",
          method: "POST",
          url: "https://interview-lo.vercel.app/api/vapi/generate",
          body: {
            type: "object",
            required: [
              "role",
              "type",
              "level",
              "techstack",
              "amount",
              "userid",
            ],
            properties: {
              role: {
                type: "string",
                value: "{{role}}",
                description: "Job role",
              },
              type: {
                type: "string",
                value: "{{type}}",
                description: "Interview type",
              },
              level: {
                type: "string",
                value: "{{level}}",
                description: "Experience level",
              },
              techstack: {
                type: "string",
                value: "{{techstack}}",
                description: "Technologies/skills",
              },
              amount: {
                type: "string",
                value: "{{amount}}",
                description: "Number of questions",
              },
              userid: {
                type: "string",
                value: "{{userid}}",
                description: "User ID",
              },
            },
          },
          function: {
            name: "generate_interview_questions",
            parameters: {
              type: "object",
              properties: {},
            },
          },
        },
        metadata: {
          position: { x: -200, y: -1100 },
        },
      },
      {
        name: "completion",
        type: "conversation",
        model: {
          provider: "openai",
          model: "gpt-4o",
          maxTokens: 150,
          temperature: 0.3,
        },
        prompt:
          "Thank the user and let them know their interview questions have been generated successfully.",
        messagePlan: {
          firstMessage:
            "Excellent! Your personalized interview questions have been generated and saved. You can now practice with your custom interview. Good luck with your preparation!",
        },
        metadata: {
          position: { x: -200, y: -800 },
        },
      },
      {
        name: "end_call",
        type: "tool",
        tool: {
          type: "endCall",
          function: {
            name: "end_interview_setup",
            parameters: {
              type: "object",
              properties: {},
            },
          },
          messages: [
            {
              type: "request-start",
              content:
                "Thank you for using our interview preparation service. Good luck!",
              blocking: true,
            },
          ],
        },
        metadata: {
          position: { x: -200, y: -500 },
        },
      },
    ],
    edges: [
      {
        from: "introduction",
        to: "collect_details",
        condition: { type: "ai", prompt: "" },
      },
      {
        from: "collect_details",
        to: "confirm_details",
        condition: { type: "ai", prompt: "" },
      },
      {
        from: "confirm_details",
        to: "generate_questions",
        condition: { type: "ai", prompt: "" },
      },
      {
        from: "generate_questions",
        to: "completion",
        condition: { type: "ai", prompt: "" },
      },
      {
        from: "completion",
        to: "end_call",
        condition: { type: "ai", prompt: "" },
      },
    ],
    globalPrompt:
      "You are a helpful interview preparation assistant. Keep responses short and conversational. Focus on collecting the required information efficiently.",
    voice: {
      provider: "vapi",
      voiceId: "sarah",
    },
  };

  try {
    const response = await fetch("https://api.vapi.ai/workflow", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create workflow: ${response.status} - ${errorText}`
      );
    }

    const newWorkflow = await response.json();
    console.log("New workflow created:", newWorkflow.id);

    return NextResponse.json({
      success: true,
      message: "New workflow created successfully",
      workflowId: newWorkflow.id,
      workflowName: newWorkflow.name,
      instruction: `Update your .env.local file with: NEXT_PUBLIC_VAPI_WORKFLOW_ID="${newWorkflow.id}"`,
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    throw error;
  }
}
