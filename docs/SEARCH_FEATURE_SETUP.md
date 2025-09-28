# Search Feature Setup Guide

## Overview
The search feature provides ChatGPT-style AI assistance with model selection (OpenAI GPT-4o Mini and Google Gemini 2.0 Flash) and conversation management.

## Database Setup

1. **Run the SQL commands** in your Supabase SQL Editor:
   - Copy the contents of `search_database_setup.sql`
   - Paste and execute in Supabase SQL Editor

2. **Verify tables created**:
   - `search_conversations` - Stores chat conversations
   - `search_messages` - Stores individual messages
   - `search_settings` - Stores user preferences

## Features

### ✅ Implemented
- **Model Selection**: Choose between OpenAI GPT-4o Mini and Google Gemini 2.0 Flash
- **Conversation Management**: Create, view, and delete conversations
- **Real-time Chat**: Send messages and get AI responses
- **Document Context**: AI uses user's uploaded documents for context
- **Source Attribution**: Shows which documents were referenced
- **Responsive Design**: Works on desktop and mobile
- **Message Actions**: Copy, thumbs up/down, regenerate responses

### 🔧 How to Use

1. **Navigate to Search Page**: Go to `/search` in your app
2. **Select AI Model**: Use the model selector in the header
3. **Start a Conversation**: Type your question and press Enter
4. **Switch Conversations**: Use the sidebar to view previous conversations
5. **Manage Conversations**: Delete old conversations using the trash icon

### 📱 Mobile Support
- Sidebar can be toggled with the menu button
- Responsive layout adapts to screen size
- Touch-friendly interface

## API Endpoints

- `POST /api/search` - Send message and get AI response
- `GET /api/search` - Get conversations or messages
- `DELETE /api/search/conversations/[id]` - Delete conversation

## Environment Variables Required

Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_API_KEY=your_gemini_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

## Troubleshooting

### Conversations not loading?
- Check browser console for errors
- Verify user authentication
- Ensure database tables are created
- Check RLS policies are in place

### AI responses not working?
- Verify API keys are set correctly
- Check network requests in browser dev tools
- Ensure user has uploaded documents for context

### Sidebar not showing?
- Check if user is authenticated
- Verify conversations are being loaded
- Try refreshing the page
