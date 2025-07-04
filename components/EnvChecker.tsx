"use client";

export const EnvChecker = () => {
  const checkEnvironment = () => {
    const envVars = {
      NEXT_PUBLIC_VAPI_WEB_TOKEN: process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN,
      NEXT_PUBLIC_VAPI_WORKFLOW_ID: process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };

    console.log("=== Environment Variables Check ===");
    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
      } else {
        console.log(`❌ ${key}: Not set`);
      }
    });
    console.log("====================================");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={checkEnvironment}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
      >
        Check Env
      </button>
    </div>
  );
};
