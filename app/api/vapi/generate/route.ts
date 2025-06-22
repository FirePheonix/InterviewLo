import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { google } from "@ai-sdk/google";
import { createDataStream, generateText } from "ai";
import { request } from "http";

export async function GET() {
  return Response.json(
    { success: true, message: "VAPI API is working!" },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, role, level, techstack, amount, userid } = body || {};

  if (!type || !role || !level || !techstack || !amount || !userid) {
    return Response.json(
      { success: false, message: "Missing required fields." },
      { status: 400 }
    );
  }

  try {
    const { text: questions } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any symbols.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        Thank you! <3
      `,
    });

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
      if (!Array.isArray(parsedQuestions)) throw new Error("Invalid format");
    } catch (e) {
      return Response.json(
        { success: false, message: "Gemini returned invalid question format." },
        { status: 500 }
      );
    }

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(","),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json(
      { success: true, message: "Interview generated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Failed to generate interview." },
      { status: 500 }
    );
  }
}
