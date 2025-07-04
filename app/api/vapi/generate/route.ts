import { db } from "@/firebase/admin";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Generate API - Received body:", body);

    const { type, role, level, techstack, amount, userid } = body || {};

    // Check for missing fields and log them
    const missing = [];
    if (!type) missing.push("type");
    if (!role) missing.push("role");
    if (!level) missing.push("level");
    if (!techstack) missing.push("techstack");
    if (!amount) missing.push("amount");
    if (!userid) missing.push("userid");

    if (missing.length > 0) {
      console.error("Generate API - Missing required fields:", missing);
      return Response.json(
        {
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
        },
        { status: 400 }
      );
    }

    console.log("Generate API - Generating questions with params:", {
      type,
      role,
      level,
      techstack,
      amount,
      userid,
    });

    const { text: questions } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `Prepare ${amount} questions for a ${level} level ${role} role. Techstack: ${techstack}. Focus: ${type}. Return as: ["Q1", "Q2", "Q3"]`,
    });

    console.log("Generate API - Raw AI response:", questions);

    // Clean up the AI response - remove markdown code blocks if present
    let cleanedQuestions = questions.trim();
    if (cleanedQuestions.startsWith("```json")) {
      cleanedQuestions = cleanedQuestions
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedQuestions.startsWith("```")) {
      cleanedQuestions = cleanedQuestions
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    console.log("Generate API - Cleaned response:", cleanedQuestions);

    const parsed = JSON.parse(cleanedQuestions);
    if (!Array.isArray(parsed)) {
      console.error("Generate API - AI response is not an array:", parsed);
      throw new Error("Invalid questions format - expected array");
    }

    console.log("Generate API - Parsed questions:", parsed);

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(","),
      questions: parsed,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    console.log("Generate API - Saving interview to database:", interview);
    await db.collection("interviews").add(interview);

    console.log("Generate API - Interview saved successfully");
    return Response.json({ success: true, questions: parsed });
  } catch (err) {
    console.error("Generate API - Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return Response.json(
      { success: false, message: `Failed to generate: ${errorMessage}` },
      { status: 500 }
    );
  }
}
