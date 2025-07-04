import { vapi } from "@/lib/vapi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId");

  if (!callId) {
    return NextResponse.json(
      { success: false, message: "Missing callId" },
      { status: 400 }
    );
  }

  try {
    console.log("Fetching call status for:", callId);
    const call = await vapi.calls.get(callId);

    // Cast to any to access properties that might not be in the type definitions
    const callData = call as any;

    console.log("=== CALL DATA DEBUG ===");
    console.log("Call ID:", callData.id);
    console.log("Call status:", callData.status);
    console.log("Call type:", callData.type);
    console.log("Call data keys:", Object.keys(callData));

    // Check for analysis data
    if (callData.analysis) {
      console.log("Analysis keys:", Object.keys(callData.analysis));
      console.log("Analysis data:", callData.analysis);
    }

    // Check for messages and transcript
    if (callData.messages) {
      console.log("Messages count:", callData.messages.length);
      console.log("Last few messages:", callData.messages.slice(-3));
    }

    if (callData.transcript) {
      console.log("Transcript:", callData.transcript);
    }

    // Check for workflow variables in multiple locations
    const possibleVariableLocations = [
      callData.analysis?.extractedVariables,
      callData.analysis?.variables,
      callData.extractedVariables,
      callData.variables,
      callData.metadata?.variables,
      callData.workflowVariables,
      callData.analysis?.workflowVariables,
      callData.analysis?.summary?.variables,
    ];

    console.log(
      "Checking for variables in locations:",
      possibleVariableLocations
    );

    let extractedVariables = null;
    for (const location of possibleVariableLocations) {
      if (location && Object.keys(location).length > 0) {
        console.log("Found variables in location:", location);
        extractedVariables = location;
        break;
      }
    }

    // If no variables found, try to extract from transcript
    if (!extractedVariables && callData.transcript) {
      console.log(
        "No variables found, attempting to extract from transcript..."
      );
      extractedVariables = extractVariablesFromTranscript(callData.transcript);
    }

    console.log("Final extracted variables:", extractedVariables);

    return NextResponse.json({
      success: true,
      status: callData.status,
      call: {
        id: callData.id,
        status: callData.status,
        extractedVariables: extractedVariables,
        messages: callData.messages || [],
        transcript: callData.transcript || null,
        // Include analysis data for debugging
        analysis: callData.analysis || null,
        // Include raw call data for debugging (limited to avoid large payloads)
        debug: {
          hasAnalysis: !!callData.analysis,
          hasMessages: !!callData.messages,
          hasTranscript: !!callData.transcript,
          dataKeys: Object.keys(callData),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching call status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch call status" },
      { status: 500 }
    );
  }
}

// Helper function to extract variables from transcript
function extractVariablesFromTranscript(transcript: string): any {
  console.log("Extracting variables from transcript:", transcript);

  const lowerTranscript = transcript.toLowerCase();
  const extracted: any = {};

  // Extract interview type
  if (lowerTranscript.includes("technical")) {
    extracted.type = "Technical";
  } else if (lowerTranscript.includes("behavioral")) {
    extracted.type = "Behavioral";
  } else if (lowerTranscript.includes("mixed")) {
    extracted.type = "Mixed";
  }

  // Extract role - look for common patterns
  const rolePatterns = [
    /(?:role|position|job).*?(?:is|as|for)\s+([a-zA-Z\s]+?)(?:\.|,|$)/gi,
    /(?:software|web|frontend|backend|full stack|data)\s+(?:engineer|developer|scientist|analyst)/gi,
    /(?:product|project)\s+manager/gi,
  ];

  for (const pattern of rolePatterns) {
    const matches = lowerTranscript.match(pattern);
    if (matches && matches.length > 0) {
      extracted.role = matches[0].trim();
      break;
    }
  }

  // Extract experience level
  if (lowerTranscript.includes("junior")) {
    extracted.level = "Junior";
  } else if (lowerTranscript.includes("senior")) {
    extracted.level = "Senior";
  } else if (lowerTranscript.includes("mid")) {
    extracted.level = "Mid";
  }

  // Extract tech stack
  const techKeywords = [
    "javascript",
    "typescript",
    "react",
    "angular",
    "vue",
    "node",
    "python",
    "java",
    "spring",
    "express",
    "mongodb",
    "sql",
    "mysql",
    "postgresql",
    "aws",
    "docker",
    "kubernetes",
    "git",
    "html",
    "css",
    "sass",
    "redux",
  ];

  const foundTech = techKeywords.filter((tech) =>
    lowerTranscript.includes(tech)
  );
  if (foundTech.length > 0) {
    extracted.techstack = foundTech.join(", ");
  }

  // Extract number of questions
  const numberMatch = lowerTranscript.match(/(\d+)\s*questions?/);
  if (numberMatch) {
    extracted.amount = numberMatch[1];
  }

  console.log("Extracted from transcript:", extracted);
  return Object.keys(extracted).length > 0 ? extracted : null;
}
