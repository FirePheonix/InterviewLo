import { vapi } from "@/lib/vapi";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, number } = body;

    console.log("Trigger API - Received request:", { workflowId, number });

    if (!workflowId || !number) {
      console.error("Trigger API - Missing required fields");
      return NextResponse.json(
        { success: false, message: "Missing number or workflowId" },
        { status: 400 }
      );
    }

    console.log("Trigger API - Creating call with workflow:", workflowId);

    const call = await vapi.calls.create({
      workflowId,
      customer: {
        number,
      },
    });

    console.log("Trigger API - Call created successfully:", call);

    // Extract call ID from the response
    const callId = (call as any).id || (call as any).callId || "unknown";

    return NextResponse.json({ success: true, callId });
  } catch (error) {
    console.error("Trigger API - Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create call",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
