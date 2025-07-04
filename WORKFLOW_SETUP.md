# VAPI Workflow Integration

This application has been updated to use VAPI workflows instead of direct assistant calls. Here's what has changed:

## New Workflow System

### API Endpoints

1. **`/api/vapi/setup-workflow`** - Creates the initial data collection workflow
2. **`/api/vapi/execute-workflow`** - Creates the interview execution workflow
3. **`/api/vapi/trigger`** - Triggers a workflow with a phone number
4. **`/api/vapi/webhook`** - Handles VAPI webhook events
5. **`/api/vapi/call-status`** - Checks the status of ongoing calls

### Frontend Changes

The `Agent` component has been updated to:

- Use API calls instead of direct VAPI SDK calls
- Poll for call status updates
- Handle workflow-based interview flow
- Support both "generate" and "interview" modes

### Environment Variables Required

Make sure you have these environment variables set:

```env
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_token_here
NEXT_PUBLIC_BASE_URL=your_app_base_url_here
```

### Webhook Setup

To properly handle workflow completion events, you need to:

1. Set up a webhook URL in your VAPI dashboard pointing to: `https://your-domain.com/api/vapi/webhook`
2. Configure the webhook to send events for:
   - `workflow-completed`
   - `call-started`
   - `call-ended`
   - `transcript`

### Usage

#### For Interview Setup (Generate Mode)

```tsx
<Agent
  userName="John Doe"
  userId="user123"
  type="generate"
  phoneNumber="+1234567890"
/>
```

#### For Interview Execution

```tsx
<Agent
  userName="John Doe"
  userId="user123"
  interviewId="interview123"
  type="interview"
  questions={["What is React?", "Explain closures"]}
  phoneNumber="+1234567890"
/>
```

### How It Works

1. **Generate Flow**:

   - Setup workflow is created to collect interview details
   - Workflow is triggered with phone number
   - User provides interview requirements via voice
   - Webhook receives extracted variables
   - Generate API is called automatically

2. **Interview Flow**:
   - Execute workflow is created with interview questions
   - Workflow is triggered with phone number
   - Interview proceeds through questions
   - Transcript is collected for feedback generation

### Notes

- Phone calls are now initiated server-side via workflows
- Real-time events are handled through polling and webhooks
- The system is more scalable but requires proper webhook configuration
- Make sure your webhook endpoint is publicly accessible for VAPI to reach it
