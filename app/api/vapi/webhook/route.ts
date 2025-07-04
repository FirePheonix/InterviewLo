import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("VAPI Webhook received:", body);

    // Handle different webhook events
    switch (body.type) {
      case "workflow-completed":
        console.log("Workflow completed:", body.workflowId);
        // Handle workflow completion
        if (body.extractedVariables) {
          console.log("Extracted variables:", body.extractedVariables);

          // If this is a generate workflow, trigger the generate API
          const { type, role, level, techstack, amount, userid } =
            body.extractedVariables;

          if (type && role && level && techstack && amount && userid) {
            try {
              const generateResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/generate`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type,
                    role,
                    level,
                    techstack,
                    amount: parseInt(amount),
                    userid,
                  }),
                }
              );

              const result = await generateResponse.json();
              console.log("Generate result:", result);
            } catch (error) {
              console.error("Error calling generate API:", error);
            }
          }
        }
        break;

      case "call-started":
        console.log("Call started:", body.callId);
        break;

      case "call-ended":
        console.log("Call ended:", body.callId);
        break;

      case "transcript":
        console.log("Transcript received:", body.transcript);
        break;

      default:
        console.log("Unhandled webhook type:", body.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
