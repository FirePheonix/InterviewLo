import { vapi } from "@/lib/vapi";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    switch (action) {
      case "test-connection":
        return await testConnection();
      case "list-workflows":
        return await listWorkflows();
      case "test-workflow-creation":
        return await testWorkflowCreation();
      case "test-call-creation":
        return await testCallCreation();
      default:
        return NextResponse.json(
          { success: false, message: "Invalid test action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function testConnection() {
  try {
    const serverToken = process.env.VAPI_SERVER_TOKEN;
    const webToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

    console.log("Testing VAPI connection...");
    console.log("Server token available:", !!serverToken);
    console.log("Web token available:", !!webToken);

    // Test with server token
    const response = await fetch("https://api.vapi.ai/call", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "VAPI connection test completed",
      data: {
        serverTokenValid: response.ok,
        webTokenAvailable: !!webToken,
        responseStatus: response.status,
        resultType: typeof result,
        hasData:
          Array.isArray(result) || (result && Object.keys(result).length > 0),
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Connection test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function listWorkflows() {
  try {
    const serverToken = process.env.VAPI_SERVER_TOKEN;

    const response = await fetch("https://api.vapi.ai/workflow", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
    });

    const workflows = await response.json();

    return NextResponse.json({
      success: true,
      message: "Workflows retrieved successfully",
      data: {
        count: Array.isArray(workflows) ? workflows.length : 0,
        workflows: workflows,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to list workflows",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function testWorkflowCreation() {
  try {
    const serverToken = process.env.VAPI_SERVER_TOKEN;

    const testWorkflow = {
      name: "Test Interview Workflow",
      nodes: [
        {
          name: "start",
          type: "start",
        },
        {
          name: "assistant",
          type: "assistant",
          assistant: {
            firstMessage:
              "Hello! This is a test workflow. Can you tell me your name?",
            model: {
              provider: "openai",
              model: "gpt-4",
              temperature: 0.7,
            },
            voice: {
              provider: "11labs",
              voiceId: "sarah",
            },
            systemPrompt:
              "You are a test assistant. Ask for the user's name and acknowledge it. Keep the conversation brief.",
          },
        },
        {
          name: "end",
          type: "end",
          sayMessage: "Thank you! This test workflow is now complete.",
        },
      ],
      edges: [
        {
          from: "start",
          to: "assistant",
        },
        {
          from: "assistant",
          to: "end",
        },
      ],
    };

    const response = await fetch("https://api.vapi.ai/workflow", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testWorkflow),
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      message: response.ok
        ? "Test workflow created successfully"
        : "Failed to create test workflow",
      data: {
        status: response.status,
        workflowId: result.id,
        result: result,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Workflow creation test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function testCallCreation() {
  try {
    const serverToken = process.env.VAPI_SERVER_TOKEN;
    const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

    if (!workflowId) {
      return NextResponse.json({
        success: false,
        message: "No workflow ID available for test",
      });
    }

    const testCall = {
      type: "webCall",
      workflowId: workflowId,
      customer: {
        number: "+1234567890",
      },
      maxDurationSeconds: 60,
      recordingEnabled: true,
    };

    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCall),
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      message: response.ok
        ? "Test call created successfully"
        : "Failed to create test call",
      data: {
        status: response.status,
        callId: result.id,
        webCallUrl: result.webCallUrl,
        result: result,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Call creation test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
