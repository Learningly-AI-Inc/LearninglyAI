# Chat Functionality Setup Guide

This guide explains how to implement modern chat functionality similar to ChatGPT using Supabase for your Learningly AI project.

## 🏗️ Architecture Overview

Modern chat apps use a three-tier architecture:
1. **Frontend**: React components with real-time updates
2. **Backend**: API routes for AI integration and message handling
3. **Database**: Supabase with real-time subscriptions

## 📋 Prerequisites

### 1. Environment Variables
Add these to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 2. Database Setup
Run the SQL schema from `project_context/chat_schema.sql` in your Supabase SQL editor:

```sql
-- This creates all necessary tables with proper relationships
-- and Row Level Security (RLS) policies
```

### 3. Dependencies
Ensure you have these packages installed:

```bash
npm install @supabase/auth-helpers-nextjs date-fns
```

## 🗄️ Database Schema

### Core Tables

1. **`chat_conversations`** - Chat sessions
   - User ID, title, model name, timestamps
   - Automatic title updates via triggers

2. **`chat_messages`** - Individual messages
   - Role (user/assistant/system), content, metadata
   - Linked to conversations with cascade delete

3. **`chat_preferences`** - User settings
   - Default model, temperature, context length
   - Auto-save settings

4. **`chat_usage`** - Analytics and billing
   - Token usage, costs, model tracking

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - users can only access their own data
- **Automatic timestamps** via database triggers
- **Cascade deletes** for data integrity

## 🔧 Implementation Steps

### Step 1: Database Setup
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `project_context/chat_schema.sql`
4. Execute the script

### Step 2: Environment Configuration
1. Copy `.env.local.example` to `.env.local`
2. Fill in your API keys and Supabase credentials
3. Restart your development server

### Step 3: Test the Setup
1. Navigate to `/chat` in your app
2. Create a new conversation
3. Send a test message
4. Verify real-time updates work

## 🚀 Key Features Implemented

### 1. Real-time Chat
- **WebSocket subscriptions** via Supabase Realtime
- **Instant message updates** across all connected clients
- **Optimistic UI updates** for better user experience

### 2. Conversation Management
- **Create/delete conversations**
- **Search and filter** conversations
- **Archive functionality**
- **Automatic title generation**

### 3. AI Integration
- **Multi-model support** (GPT-3.5, GPT-4, Gemini)
- **Conversation context** preservation
- **Usage tracking** and cost monitoring
- **Error handling** and fallbacks

### 4. Security & Performance
- **Authentication required** for all operations
- **User data isolation** via RLS policies
- **Database indexing** for fast queries
- **Connection pooling** via Supabase

## 🔌 API Endpoints

### POST `/api/chat`
- **Purpose**: Send message and get AI response
- **Body**: `{ message, conversationId, modelName? }`
- **Response**: `{ success, response, messageId, tokensUsed, cost }`

### GET `/api/chat?conversationId=...`
- **Purpose**: Fetch conversation messages
- **Response**: `{ messages: ChatMessage[] }`

## 🎯 Usage Examples

### Creating a New Chat
```typescript
const { createConversation } = useChat();

const newChat = await createConversation({
  title: "Math Help Session",
  model_name: "gpt-4"
});
```

### Sending a Message
```typescript
const { sendMessage } = useChat();

await sendMessage("Can you explain calculus?");
```

### Real-time Updates
```typescript
// Automatically handled by the hook
// Messages appear in real-time across all clients
```

## 🧪 Testing

### 1. Database Connection
```bash
# Check if tables were created
supabase db diff --schema public
```

### 2. Authentication
```bash
# Verify user can access their data
# Test RLS policies work correctly
```

### 3. Real-time Features
```bash
# Open multiple browser tabs
# Send messages in one tab
# Verify they appear in others instantly
```

## 🔍 Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check if user is authenticated
   - Verify RLS policies are enabled

2. **Real-time not working**
   - Ensure Supabase Realtime is enabled
   - Check subscription setup in the hook

3. **AI responses failing**
   - Verify API keys are correct
   - Check rate limits and quotas

4. **Database errors**
   - Run schema setup again
   - Check table permissions

### Debug Commands

```bash
# Check Supabase logs
supabase logs

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# Test database connection
supabase db ping
```

## 📈 Scaling Considerations

### Performance
- **Message pagination** for long conversations
- **Database connection pooling**
- **CDN for static assets**

### Cost Management
- **Token usage limits** per user
- **Model selection** based on user tier
- **Usage analytics** and billing

### Security
- **Rate limiting** on API endpoints
- **Content filtering** for inappropriate content
- **Audit logging** for compliance

## 🎨 Customization

### UI Themes
- Modify `ChatInterface` component styles
- Use Tailwind CSS classes for theming
- Implement dark/light mode toggle

### AI Models
- Add new model providers in the API route
- Implement model selection UI
- Add model-specific configuration

### Features
- **File attachments** via Supabase Storage
- **Voice messages** with transcription
- **Code highlighting** for programming chats
- **Markdown rendering** for rich content

## 📚 Additional Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google AI Documentation](https://ai.google.dev/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## 🚀 Next Steps

1. **Implement streaming responses** for better UX
2. **Add file upload support** for documents and images
3. **Create conversation templates** for common use cases
4. **Build analytics dashboard** for usage insights
5. **Implement conversation sharing** between users

---

This setup provides a solid foundation for a production-ready chat application. The architecture is scalable, secure, and follows modern best practices for real-time applications.
