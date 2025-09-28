# Enhanced Conversation System Setup Guide

This guide will help you implement a ChatGPT-like conversation system with advanced context management, token optimization, and user personalization.

## 🏗️ Architecture Overview

The enhanced conversation system consists of several distributed components:

### Core Services
- **ConversationContextManager** - Manages conversation context with smart token optimization
- **TokenManager** - Handles token counting, cost estimation, and optimization strategies
- **ConversationSummarizer** - Creates AI-powered summaries to reduce token usage
- **ConversationPersistence** - Handles database operations for conversations and messages

### API Layer
- **Enhanced Search API** (`/api/search/enhanced`) - Main API endpoint with context management
- **Legacy Search API** (`/api/search`) - Original API (still functional)

### Frontend Components
- **useEnhancedConversation** - Custom hook for conversation management
- **ContextDashboard** - Real-time token usage and cost monitoring
- **ContextOptimizationTips** - Smart recommendations for context optimization

## 📋 Prerequisites

1. **Database Setup**: Run the migration to create the conversation summaries table
2. **Environment Variables**: Ensure your AI API keys are configured
3. **Dependencies**: All required packages should already be installed

## 🚀 Setup Steps

### Step 1: Database Migration

Run the following SQL migration to create the conversation summaries table:

```sql
-- Run this in your Supabase SQL editor
-- File: create_conversation_summaries_table.sql
```

### Step 2: Update Your Search Page

Replace your existing search page implementation with the enhanced version:

```typescript
// In your search page component
import { useEnhancedConversation } from '@/hooks/use-enhanced-conversation'
import { ContextDashboard, ContextOptimizationTips } from '@/components/conversation/context-dashboard'

export default function SearchPage() {
  const {
    messages,
    conversations,
    selectedConversationId,
    isLoading,
    isTyping,
    error,
    stats,
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
    totalTokens,
    estimatedCost
  } = useEnhancedConversation({
    apiEndpoint: '/api/search/enhanced', // Use enhanced API
    enableTokenTracking: true,
    enableCostEstimation: true
  })

  // Your existing UI code with enhanced features
}
```

### Step 3: Configure Token Limits

Customize token limits based on your needs:

```typescript
// In your app initialization
import { tokenManager } from '@/lib/token-manager'

// Update token limits
tokenManager.updateLimits({
  maxTokensPerRequest: 4000,      // Max tokens per API call
  maxTokensPerConversation: 8000, // Max tokens per conversation
  warningThreshold: 0.8,          // Show warning at 80% of limit
  costPerToken: 0.00002          // Cost per token for estimation
})
```

### Step 4: Enable Context Summarization

Configure the conversation summarizer:

```typescript
// In your app initialization
import { conversationSummarizer } from '@/lib/conversation-summarizer'

// Update summarization config
conversationSummarizer.updateConfig({
  maxSummaryLength: 500,           // Max characters in summary
  includeKeyPoints: true,          // Extract key points
  includeTopics: true,             // Extract topics
  includeSentiment: true,          // Analyze sentiment
  summaryExpiryHours: 24          // Summary cache duration
})
```

## 🎯 Key Features

### 1. Smart Context Management
- **Sliding Window**: Keeps recent messages in context
- **Automatic Summarization**: Summarizes old messages when approaching token limits
- **Token Optimization**: Removes or truncates messages to stay within limits

### 2. Cost Tracking
- **Real-time Cost Estimation**: Shows estimated costs for each conversation
- **Token Usage Monitoring**: Tracks token usage across all conversations
- **Budget Alerts**: Warns when approaching cost limits

### 3. User Personalization
- **Personalized Prompts**: Uses user's name and preferences
- **Document Context**: Incorporates user's uploaded documents
- **Conversation History**: Maintains context across sessions

### 4. Performance Optimization
- **Caching**: Caches conversation context for faster responses
- **Batch Operations**: Efficient database operations
- **Retry Logic**: Automatic retry for failed requests

## 📊 Monitoring and Analytics

### Context Dashboard
The context dashboard provides real-time insights:

- **Token Usage**: Current token consumption vs limits
- **Cost Estimation**: Real-time cost tracking
- **Message Count**: Conversation length monitoring
- **Performance Metrics**: Average tokens per message

### Optimization Tips
Smart recommendations for context optimization:

- **Token Limit Warnings**: Alerts when approaching limits
- **Conversation Length**: Suggests summarization for long conversations
- **Cost Optimization**: Recommendations for reducing costs

## 🔧 Configuration Options

### Token Management
```typescript
const tokenConfig = {
  maxTokensPerRequest: 4000,      // Adjust based on your model limits
  maxTokensPerConversation: 8000, // Total conversation limit
  warningThreshold: 0.8,          // Warning at 80% of limit
  costPerToken: 0.00002          // Update based on your model pricing
}
```

### Context Management
```typescript
const contextConfig = {
  maxMessages: 20,                // Keep last 20 messages
  maxTokens: 4000,               // Max tokens per request
  summaryThreshold: 3000,        // Summarize when approaching limit
  includeSystemMessage: true     // Include system prompts
}
```

### Summarization
```typescript
const summarizationConfig = {
  maxSummaryLength: 500,          // Summary character limit
  includeKeyPoints: true,         // Extract key points
  includeTopics: true,            // Extract topics
  includeSentiment: true,         // Analyze sentiment
  summaryExpiryHours: 24         // Cache duration
}
```

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Token Limit Exceeded**: Automatic optimization and summarization
- **API Failures**: Graceful degradation with user feedback
- **Authentication Errors**: Proper user session management

## 📈 Performance Benefits

### Before (Original System)
- ❌ No context management
- ❌ No token optimization
- ❌ No cost tracking
- ❌ Limited conversation length
- ❌ No user personalization

### After (Enhanced System)
- ✅ Smart context management with summarization
- ✅ Automatic token optimization
- ✅ Real-time cost tracking and estimation
- ✅ Unlimited conversation length with context preservation
- ✅ Personalized responses with user context
- ✅ Performance monitoring and optimization tips

## 🔄 Migration from Legacy System

### Gradual Migration
1. **Phase 1**: Deploy enhanced API alongside existing API
2. **Phase 2**: Update frontend to use enhanced API
3. **Phase 3**: Monitor performance and user feedback
4. **Phase 4**: Deprecate legacy API (optional)

### Backward Compatibility
- Legacy API remains functional
- Existing conversations are preserved
- No data migration required
- Users can switch between systems

## 🛠️ Troubleshooting

### Common Issues

1. **High Token Usage**
   - Check token limits configuration
   - Enable summarization for long conversations
   - Monitor context dashboard for optimization tips

2. **Slow Responses**
   - Check network connectivity
   - Monitor API rate limits
   - Consider using faster models for simple queries

3. **Cost Concerns**
   - Set appropriate token limits
   - Enable cost estimation
   - Monitor usage through dashboard

### Debug Mode
Enable debug logging:

```typescript
// In your environment variables
NEXT_PUBLIC_DEBUG_CONVERSATION=true
```

## 📚 API Reference

### Enhanced Search API

#### POST `/api/search/enhanced`
```typescript
// Request
{
  message: string
  conversationId?: string
  model?: string
}

// Response
{
  response: string
  sources: string[]
  conversationId: string
  tokenUsage: {
    totalTokens: number
    estimatedCost: number
  }
}
```

#### GET `/api/search/enhanced`
```typescript
// Query Parameters
?userId=string&conversationId=string

// Response
{
  conversations: ConversationData[]
  stats: ConversationStats
}
```

#### DELETE `/api/search/enhanced`
```typescript
// Query Parameters
?conversationId=string

// Response
{
  success: boolean
  message: string
}
```

## 🎉 Next Steps

1. **Deploy the enhanced system** following the setup steps
2. **Monitor performance** using the context dashboard
3. **Optimize configuration** based on usage patterns
4. **Gather user feedback** and iterate on features
5. **Consider additional features** like conversation search, export, etc.

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the API logs for error details
3. Monitor the context dashboard for optimization opportunities
4. Consider adjusting configuration parameters

The enhanced conversation system provides a robust foundation for building ChatGPT-like experiences with proper context management, cost control, and user personalization.
