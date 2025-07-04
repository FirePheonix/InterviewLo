"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { createVapiClient } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  phoneNumber = "+1234567890", // Default phone number
  profileImage,
  mode = "assistant", // Default to assistant mode
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  useEffect(() => {
    // Poll for call status only in workflow mode
    let intervalId: NodeJS.Timeout;

    if (
      mode === "workflow" &&
      currentCallId &&
      callStatus === CallStatus.ACTIVE
    ) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/vapi/call-status?callId=${currentCallId}`
          );
          const { success, status, call } = await response.json();

          if (success) {
            console.log("Call status:", status);

            // Update call status based on VAPI response
            if (status === "ended" || status === "completed") {
              setCallStatus(CallStatus.FINISHED);
              setCurrentCallId(null);
              clearInterval(intervalId);
            }

            // Handle any messages from the call
            if (call && call.messages) {
              const newMessages = call.messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content || msg.transcript || "",
              }));
              setMessages(newMessages);
            }
          }
        } catch (error) {
          console.error("Error checking call status:", error);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mode, currentCallId, callStatus]);

  useEffect(() => {
    // Setup event listeners for both modes
    if (mode === "assistant" || mode === "workflow") {
      // Use VAPI event listeners for both modes since we're using Web SDK
      const vapi = createVapiClient();

      if (!vapi) {
        console.warn("VAPI client not available");
        return;
      }

      const onCallStart = () => {
        console.log("VAPI call started");
        setCallStatus(CallStatus.ACTIVE);
      };

      const onCallEnd = () => {
        console.log("VAPI call ended");
        setCallStatus(CallStatus.FINISHED);
      };

      const onMessage = (message: any) => {
        console.log("VAPI message received:", message);

        if (
          message.type === "transcript" &&
          message.transcriptType === "final"
        ) {
          const newMessage = {
            role: message.role,
            content: message.transcript,
          };
          setMessages((prev) => [...prev, newMessage]);
          console.log("New message:", newMessage);
        }

        // Handle workflow variable extraction
        if (
          message.type === "workflow-variable-extraction" ||
          message.type === "variable-extraction"
        ) {
          console.log("Variable extraction message:", message);
          // Store the extracted variables for later use
          if (message.variables) {
            console.log("Extracted variables:", message.variables);
            // Store in component state or handle immediately
          }
        }

        // Handle workflow completion
        if (
          message.type === "workflow-completed" ||
          message.type === "workflow-finished"
        ) {
          console.log("Workflow completed message:", message);
          if (message.extractedVariables) {
            console.log(
              "Final extracted variables:",
              message.extractedVariables
            );
          }
        }
      };

      const onSpeechStart = () => {
        console.log("Speech started");
        setIsSpeaking(true);
      };

      const onSpeechEnd = () => {
        console.log("Speech ended");
        setIsSpeaking(false);
      };

      const onError = (error: any) => {
        console.error("VAPI Error:", error);
        setCallStatus(CallStatus.INACTIVE);
      };

      vapi.on("call-start", onCallStart);
      vapi.on("call-end", onCallEnd);
      vapi.on("message", onMessage);
      vapi.on("speech-start", onSpeechStart);
      vapi.on("speech-end", onSpeechEnd);
      vapi.on("error", onError);

      return () => {
        vapi.off("call-start", onCallStart);
        vapi.off("call-end", onCallEnd);
        vapi.off("message", onMessage);
        vapi.off("speech-start", onSpeechStart);
        vapi.off("speech-end", onSpeechEnd);
        vapi.off("error", onError);
      };
    }

    console.log(`Agent initialized for ${mode} mode`);
    console.log("Type:", type, "User:", userName, "UserID:", userId);
  }, [mode, type, userName, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    const handleGenerateInterview = async () => {
      console.log("handleGenerateInterview - Starting interview generation");
      console.log("Messages for extraction:", messages);

      // For workflow mode, we should get the extracted variables from the call
      // For assistant mode, we extract from the conversation transcript
      let interviewData;

      if (mode === "workflow" && currentCallId) {
        // Get the call data which should contain extracted variables
        console.log("Fetching call data for extracted variables...");
        try {
          const response = await fetch(
            `/api/vapi/call-status?callId=${currentCallId}`
          );
          const { success, call } = await response.json();

          if (success && call) {
            console.log("Call data received:", call);

            let extractedVariables = call.extractedVariables;

            // If no extracted variables, try to extract from transcript
            if (!extractedVariables && call.transcript) {
              console.log(
                "No extracted variables found, parsing transcript..."
              );
              extractedVariables = parseTranscriptForVariables(call.transcript);
            }

            if (
              extractedVariables &&
              Object.keys(extractedVariables).length > 0
            ) {
              console.log("Using extracted variables:", extractedVariables);

              // Use the extracted variables from the workflow
              interviewData = {
                type: extractedVariables.type || "Technical",
                role: extractedVariables.role || "Software Engineer",
                level: extractedVariables.level || "Mid",
                techstack:
                  extractedVariables.techstack || "JavaScript,React,Node.js",
                amount: parseInt(extractedVariables.amount) || 5,
              };
            } else {
              console.warn("No variables found in call data or transcript");
              // Try to extract from local messages as fallback
              if (messages.length > 0) {
                console.log("Attempting to extract from local messages...");
                interviewData = extractFromTranscript();
              } else {
                console.warn(
                  "Using default values - no conversation data available"
                );
                interviewData = {
                  type: "Technical",
                  role: "Software Engineer",
                  level: "Mid",
                  techstack: "JavaScript,React,Node.js",
                  amount: 5,
                };
              }
            }
          } else {
            console.error("Failed to fetch call data:", response.status);
            // Fallback to local extraction
            interviewData = extractFromTranscript();
          }
        } catch (error) {
          console.error("Error fetching call data:", error);
          // Fallback to local extraction
          interviewData = extractFromTranscript();
        }
      } else {
        // Assistant mode - extract from conversation transcript
        console.log(
          "Extracting from conversation transcript (assistant mode)..."
        );
        interviewData = extractFromTranscript();
      }

      console.log("Final interview data:", interviewData);

      // Validate required data
      if (!userId) {
        console.error("Missing userId for interview generation");
        router.push("/");
        return;
      }

      console.log("Sending interview data to API:", {
        ...interviewData,
        userid: userId,
      });

      try {
        const response = await fetch("/api/vapi/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...interviewData,
            userid: userId,
          }),
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("API response data:", result);

        if (result.success) {
          console.log(
            "✅ Interview questions generated successfully:",
            result.questions
          );
          router.push("/");
        } else {
          console.error("❌ API returned success: false", result.message);
          router.push("/");
        }
      } catch (error) {
        console.error("❌ Error generating interview:", error);
        router.push("/");
      }
    };

    // Helper function to parse transcript for variables
    const parseTranscriptForVariables = (transcript: string) => {
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
        "software engineer",
        "frontend developer",
        "backend developer",
        "full stack developer",
        "data scientist",
        "product manager",
        "devops engineer",
        "mobile developer",
      ];

      for (const rolePattern of rolePatterns) {
        if (lowerTranscript.includes(rolePattern)) {
          extracted.role = rolePattern
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
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
        "aws",
      ];

      const foundTech = techKeywords.filter((tech) =>
        lowerTranscript.includes(tech)
      );
      if (foundTech.length > 0) {
        extracted.techstack = foundTech.join(",");
      }

      // Extract number of questions
      const numberMatch = lowerTranscript.match(/(\d+)\s*questions?/);
      if (numberMatch) {
        extracted.amount = numberMatch[1];
      }

      return Object.keys(extracted).length > 0 ? extracted : null;
    };

    // Helper function to extract from transcript (for assistant mode)
    const extractFromTranscript = () => {
      // Get all conversation content
      const conversationText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")
        .toLowerCase();
      console.log("Conversation text for parsing:", conversationText);

      // Extract interview type - look for explicit mentions
      let type = "Technical"; // default
      if (
        conversationText.includes("behavioral") ||
        conversationText.includes("behavior")
      ) {
        type = "Behavioral";
      } else if (
        conversationText.includes("mixed") ||
        conversationText.includes("combination")
      ) {
        type = "Mixed";
      }

      // Extract role - improved matching
      let role = "Software Engineer"; // default
      const roleKeywords = {
        frontend: "Frontend Developer",
        "front-end": "Frontend Developer",
        "front end": "Frontend Developer",
        backend: "Backend Developer",
        "back-end": "Backend Developer",
        "back end": "Backend Developer",
        "full stack": "Full Stack Developer",
        fullstack: "Full Stack Developer",
        "data scientist": "Data Scientist",
        "data analyst": "Data Analyst",
        "product manager": "Product Manager",
        devops: "DevOps Engineer",
        qa: "QA Engineer",
        "quality assurance": "QA Engineer",
        mobile: "Mobile Developer",
        android: "Android Developer",
        ios: "iOS Developer",
        "software engineer": "Software Engineer",
        developer: "Software Developer",
      };

      // Look for role mentions
      for (const [keyword, roleName] of Object.entries(roleKeywords)) {
        if (conversationText.includes(keyword)) {
          role = roleName;
          console.log(`Found role keyword '${keyword}' -> '${roleName}'`);
          break;
        }
      }

      // Extract level
      let level = "Mid"; // default
      if (
        conversationText.includes("junior") ||
        conversationText.includes("entry") ||
        conversationText.includes("beginner")
      ) {
        level = "Junior";
      } else if (
        conversationText.includes("senior") ||
        conversationText.includes("lead") ||
        conversationText.includes("principal")
      ) {
        level = "Senior";
      }

      // Extract tech stack - comprehensive list
      const techKeywords = [
        "react",
        "angular",
        "vue",
        "svelte",
        "javascript",
        "typescript",
        "python",
        "java",
        "node",
        "nodejs",
        "express",
        "mongodb",
        "mysql",
        "postgresql",
        "sql",
        "aws",
        "docker",
        "kubernetes",
        "git",
        "html",
        "css",
        "sass",
        "redux",
        "graphql",
        "rest",
        "api",
        "microservices",
        "spring",
        "django",
        "flask",
        "laravel",
        "php",
        "ruby",
        "rails",
        "golang",
        "rust",
        "c++",
        "c#",
        "dotnet",
        ".net",
      ];
      const foundTech = techKeywords.filter((tech) =>
        conversationText.includes(tech)
      );
      const techstack =
        foundTech.length > 0 ? foundTech.join(",") : "JavaScript,React,Node.js";
      console.log("Found technologies:", foundTech);

      // Extract number of questions - improved regex
      let amount = 5; // default
      const numberMatches = [
        conversationText.match(/(\d+)\s*(questions?|interview)/),
        conversationText.match(
          /(three|four|five|six|seven|eight|nine|ten)\s*(questions?)/
        ),
        conversationText.match(/prepare\s+(\d+)/),
        conversationText.match(/(\d+)\s*mock/),
      ];

      for (const match of numberMatches) {
        if (match) {
          let num;
          if (match[1] === "three") num = 3;
          else if (match[1] === "four") num = 4;
          else if (match[1] === "five") num = 5;
          else if (match[1] === "six") num = 6;
          else if (match[1] === "seven") num = 7;
          else if (match[1] === "eight") num = 8;
          else if (match[1] === "nine") num = 9;
          else if (match[1] === "ten") num = 10;
          else num = parseInt(match[1]);

          if (num >= 3 && num <= 10) {
            amount = num;
            console.log(`Found question count: ${amount}`);
            break;
          }
        }
      }

      const extracted = { type, role, level, techstack, amount };
      console.log("Final extracted data:", extracted);
      return extracted;
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        handleGenerateInterview();
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const testVapiWorkflow = async () => {
    console.log("=== VAPI Workflow Test ===");

    try {
      // Test connection
      const connectionTest = await fetch("/api/vapi/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection" }),
      });
      const connectionResult = await connectionTest.json();
      console.log("Connection test:", connectionResult);

      // Test workflow creation
      const workflowTest = await fetch("/api/vapi/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-workflow-creation" }),
      });
      const workflowResult = await workflowTest.json();
      console.log("Workflow creation test:", workflowResult);

      // List existing workflows
      const listTest = await fetch("/api/vapi/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-workflows" }),
      });
      const listResult = await listTest.json();
      console.log("List workflows test:", listResult);
    } catch (error) {
      console.error("Test error:", error);
    }
  };

  const testVapiClient = () => {
    console.log("=== VAPI Client Test ===");
    const client = createVapiClient();

    if (!client) {
      console.error("❌ VAPI client creation failed");
      return;
    }

    console.log("✅ VAPI client created successfully");
    console.log("Client instance:", client);

    // Test if the client has the expected methods
    console.log("Available methods:", {
      start: typeof client.start,
      stop: typeof client.stop,
      on: typeof client.on,
      off: typeof client.off,
    });
  };

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    // Debug environment variables
    console.log("Environment check:");
    console.log(
      "- VAPI Token available:",
      !!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN
    );
    console.log(
      "- Workflow ID available:",
      !!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID
    );
    console.log("- Mode:", mode);
    console.log("- Type:", type);

    try {
      if (mode === "workflow") {
        // Workflow mode - use API routes
        await handleWorkflowCall();
      } else {
        // Assistant mode - use direct VAPI client
        await handleAssistantCall();
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleWorkflowCall = async () => {
    console.log("=== Starting Workflow Mode ===");

    if (type === "generate") {
      // Step 1: Setup workflow
      console.log("Setting up workflow for data collection...");

      const setupResponse = await fetch("/api/vapi/setup-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const setupResult = await setupResponse.json();
      console.log("Setup workflow response:", setupResult);

      if (!setupResult.success) {
        console.error("Failed to setup workflow:", setupResult.message);
        setCallStatus(CallStatus.INACTIVE);
        return;
      }

      // Step 2: Use the actual VAPI workflow via API
      // This connects to your real workflow with proper variable extraction
      console.log("Starting VAPI workflow via API...");

      const vapi = createVapiClient();

      if (!vapi) {
        console.error("VAPI Web SDK not available. Cannot start workflow.");
        setCallStatus(CallStatus.INACTIVE);
        return;
      }

      try {
        console.log("Creating workflow call via API...");

        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;

        if (!workflowId) {
          console.error("No workflow ID found in environment variables");
          setCallStatus(CallStatus.INACTIVE);
          return;
        }

        console.log("Using workflow ID:", workflowId);

        // Create a workflow call using the API route
        // This will create a call with your workflow that has variable extraction
        const callResponse = await fetch("/api/vapi/workflow-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId: workflowId,
            phoneNumber: phoneNumber,
            variableValues: {
              username: userName,
              userid: userId,
            },
          }),
        });

        const callResult = await callResponse.json();
        console.log("Workflow call response:", callResult);

        if (callResult.success) {
          console.log("Workflow call created successfully");
          setCurrentCallId(callResult.callId);
          setCallStatus(CallStatus.ACTIVE);

          // Start polling for call status to get extracted variables
          console.log(
            "Starting to monitor workflow call for variable extraction..."
          );
        } else {
          console.error("Failed to create workflow call:", callResult.message);
          setCallStatus(CallStatus.INACTIVE);
        }
      } catch (error) {
        console.error("Failed to start workflow conversation:", error);
        setCallStatus(CallStatus.INACTIVE);
      }
    } else {
      // For interview mode, use the interviewer assistant
      console.log("Starting interview mode...");
      await handleAssistantCall();
    }
  };

  const handleAssistantCall = async () => {
    const vapi = createVapiClient();

    if (!vapi) {
      console.error(
        "VAPI client not available - check NEXT_PUBLIC_VAPI_WEB_TOKEN"
      );
      setCallStatus(CallStatus.INACTIVE);
      return;
    }

    try {
      if (type === "generate") {
        const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
        if (workflowId) {
          console.warn(
            "Workflow ID found but assistant mode doesn't support workflow IDs directly. Using interviewer assistant instead."
          );
        }

        console.log(
          "Starting VAPI call with interviewer assistant for data collection"
        );

        // For now, use the interviewer with variable values to customize behavior
        await vapi.start(interviewer, {
          variableValues: {
            username: userName,
            userid: userId,
            setupMode: "true", // Flag to indicate this is setup mode
          },
        });
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        console.log("Starting VAPI call with assistant config");
        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      }

      setCallStatus(CallStatus.ACTIVE);
    } catch (error) {
      console.error("Error in handleAssistantCall:", error);
      setCallStatus(CallStatus.INACTIVE);
      throw error; // Re-throw to be caught by handleCall
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    setCurrentCallId(null);

    if (mode === "assistant") {
      const vapi = createVapiClient();
      if (vapi) {
        vapi.stop();
      }
    } else {
      // Workflow mode - call management is handled server-side
      console.log("Workflow call ended by user");
    }
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src={profileImage || "/user-avatar.png"}
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {(callStatus === CallStatus.CONNECTING ||
        callStatus === CallStatus.ACTIVE) && (
        <div className="w-full flex justify-center mb-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">
              {callStatus === CallStatus.CONNECTING
                ? "Setting up workflow..."
                : currentCallId
                ? `Call active (ID: ${currentCallId.slice(0, 8)}...)`
                : "Processing..."}
            </span>
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center gap-2">
        {callStatus !== "ACTIVE" ? (
          <>
            <button className="relative btn-call" onClick={() => handleCall()}>
              <span
                className={cn(
                  "absolute animate-ping rounded-full opacity-75",
                  callStatus !== "CONNECTING" && "hidden"
                )}
              />

              <span className="relative">
                {callStatus === "INACTIVE"
                  ? type === "generate"
                    ? `Start Interview Setup (${mode})`
                    : `Start Interview (${mode})`
                  : callStatus === "FINISHED"
                  ? "Call Again"
                  : callStatus === "CONNECTING"
                  ? "Connecting..."
                  : "Connecting..."}
              </span>
            </button>

            {mode === "assistant" && (
              <>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  onClick={testVapiClient}
                >
                  Test VAPI Client
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  onClick={testVapiWorkflow}
                >
                  Test Workflow
                </button>
              </>
            )}
            {mode === "workflow" && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                onClick={testVapiWorkflow}
              >
                Debug Workflow
              </button>
            )}
          </>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
