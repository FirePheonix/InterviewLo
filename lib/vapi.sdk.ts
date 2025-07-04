// VAPI Web SDK - Only used for direct assistant calls
// For workflow-based calls, use the API routes instead

import Vapi from "@vapi-ai/web";

// Only initialize VAPI client if we have a token and need direct calls
export const createVapiClient = () => {
  const token = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

  if (!token) {
    console.warn("VAPI web token not found - direct calls not available");
    console.warn(
      "Make sure NEXT_PUBLIC_VAPI_WEB_TOKEN is set in your environment"
    );
    return null;
  }

  console.log(
    "Creating VAPI client with token:",
    token.substring(0, 10) + "..."
  );

  try {
    const vapiClient = new Vapi(token);
    console.log("VAPI client created successfully");
    return vapiClient;
  } catch (error) {
    console.error("Error creating VAPI client:", error);
    return null;
  }
};

// For backward compatibility with assistant-based calls
export const vapi = createVapiClient();
