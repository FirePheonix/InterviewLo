import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("Setting up interview workflow...");

    // Use the existing workflow ID from the environment
    const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

    if (!workflowId) {
      throw new Error(
        "NEXT_PUBLIC_VAPI_WORKFLOW_ID environment variable not set"
      );
    }

    console.log("Using existing workflow ID:", workflowId);

    // Verify the workflow exists by fetching it
    const serverToken = process.env.VAPI_SERVER_TOKEN;
    if (!serverToken) {
      throw new Error("VAPI_SERVER_TOKEN environment variable not set");
    }

    const workflowResponse = await fetch(
      `https://api.vapi.ai/workflow/${workflowId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!workflowResponse.ok) {
      console.error("Failed to fetch workflow:", workflowResponse.status);
      throw new Error(`Workflow not found: ${workflowResponse.status}`);
    }

    const workflow = await workflowResponse.json();
    console.log("Successfully verified workflow:", workflow.name);

    // Check if the workflow has variable extraction configured
    const hasVariableExtraction = workflow.nodes.some(
      (node: any) =>
        node.variableExtractionPlan && node.variableExtractionPlan.output
    );

    if (!hasVariableExtraction) {
      console.warn("Workflow does not have variable extraction configured");
    } else {
      console.log("✅ Workflow has variable extraction configured");
    }

    return NextResponse.json({
      success: true,
      workflowId: workflowId,
      message: "Using existing workflow with variable extraction configured",
      workflowName: workflow.name,
      hasVariableExtraction: hasVariableExtraction,
    });
  } catch (error) {
    console.error("Error setting up workflow:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to setup workflow",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
