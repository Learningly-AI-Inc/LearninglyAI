// API Configuration for Learningly AI
// This file manages the API base URL for real endpoints

export const API_CONFIG = {
  // Base URL for API calls
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  
  // API version
  VERSION: 'v1',
  
  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // Rate limiting configuration
  RATE_LIMITS: {
    AUTH: 10, // requests per minute
    AGENT_EXECUTION: 30,
    FILE_UPLOAD: 5,
    DEFAULT: 100,
  },
  
  // Timeout settings
  TIMEOUTS: {
    REQUEST: 30000, // 30 seconds
    UPLOAD: 300000, // 5 minutes
  },
}

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, '') // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, '') // Remove leading slash
  return `${baseUrl}/${cleanEndpoint}`
}

// Helper function to check if we're using mock API (deprecated)
export function isMockApi(): boolean {
  return false // No longer using mock API
}

// Helper function to get auth headers
export function getAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    ...API_CONFIG.DEFAULT_HEADERS,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    OAUTH: '/auth/oauth',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify',
  },
  
  // n8n webhooks
  N8N_WEBHOOKS: {
    // Webhook for parsing PDF and DOCX files
    UPLOAD_KNOWLEDGE_BASE_AS: 'https://n8n.srv934833.hstgr.cloud/webhook/upload-knowledge-base-as',
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile',
    CHANGE_PASSWORD: '/user/changePwd',
  },
  
  // Agent Management
  AGENT: {
    LIST: '/agents/list',
    RUN: '/agent/run',
  },
  
  // Prompt Management
  PROMPT: {
    UPDATE: '/prompt/update',
  },
  
  // Knowledge Base
  KB: {
    INGEST: '/kb/ingest',
    LIST: '/kb/list',
    DELETE: '/kb/delete',
    LINK_ADD: '/kb/linkAdd',
    YT_INGEST: '/kb/ytIngest',
  },
  
  // Conversations
  CONVERSATION: {
    LIST: '/conversation/list',
    GET: '/conversation/get',
    RENAME: '/conversation/rename',
    DELETE: '/conversation',
  },
  
  // Media Library
  MEDIA: {
    LIST: '/media/list',
    UPLOAD: '/media/upload',
  },
  
  // Organization
  ORG: {
    BRAND: '/org/brand',
    LIMITS: '/org/limits',
  },
  
  // Usage
  USAGE: {
    ORG_MONTH: '/usage/orgMonth',
  },
  
  // Webhooks
  WEBHOOK: {
    KB_PROCESSING_COMPLETE: '/webhook/kb-processing-complete',
    CONVERSATION_UPDATED: '/webhook/conversation-updated',
  },
} as const

// Type for API endpoints
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS][keyof typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]]

// Helper function to build endpoint URL
export function buildEndpointUrl(category: keyof typeof API_ENDPOINTS, endpoint: string): string {
  return getApiUrl(`${API_ENDPOINTS[category][endpoint as keyof typeof API_ENDPOINTS[typeof category]]}`)
}

// Debug configuration for webhook monitoring
export const DEBUG_CONFIG = {
  // Enable debug logging for webhooks
  ENABLE_WEBHOOK_DEBUG: process.env.NODE_ENV === 'development' || process.env.DEBUG_WEBHOOKS === 'true',
  
  // Debug levels
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
  
  // Webhook debug settings
  WEBHOOK_DEBUG: {
    LOG_REQUEST_HEADERS: true,
    LOG_REQUEST_BODY: true,
    LOG_RESPONSE_HEADERS: true,
    LOG_RESPONSE_BODY: true,
    LOG_TIMING: true,
    LOG_ERRORS: true,
  },
}

// Debug logger for webhook operations
export class WebhookDebugger {
  private static instance: WebhookDebugger
  private logs: Array<{
    timestamp: string
    level: string
    webhook: string
    message: string
    data?: any
  }> = []

  static getInstance(): WebhookDebugger {
    if (!WebhookDebugger.instance) {
      WebhookDebugger.instance = new WebhookDebugger()
    }
    return WebhookDebugger.instance
  }

  log(level: string, webhook: string, message: string, data?: any): void {
    if (!DEBUG_CONFIG.ENABLE_WEBHOOK_DEBUG) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      webhook,
      message,
      data,
    }

    this.logs.push(logEntry)

    // Keep only last 100 logs to prevent memory issues
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[WEBHOOK DEBUG] ${webhook}`
      switch (level) {
        case DEBUG_CONFIG.LEVELS.ERROR:
          console.error(prefix, message, data)
          break
        case DEBUG_CONFIG.LEVELS.WARN:
          console.warn(prefix, message, data)
          break
        case DEBUG_CONFIG.LEVELS.INFO:
          console.info(prefix, message, data)
          break
        default:
          console.log(prefix, message, data)
      }
    }
  }

  error(webhook: string, message: string, data?: any): void {
    this.log(DEBUG_CONFIG.LEVELS.ERROR, webhook, message, data)
  }

  warn(webhook: string, message: string, data?: any): void {
    this.log(DEBUG_CONFIG.LEVELS.WARN, webhook, message, data)
  }

  info(webhook: string, message: string, data?: any): void {
    this.log(DEBUG_CONFIG.LEVELS.INFO, webhook, message, data)
  }

  debug(webhook: string, message: string, data?: any): void {
    this.log(DEBUG_CONFIG.LEVELS.DEBUG, webhook, message, data)
  }

  getLogs(): Array<any> {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }
}

// Helper function to send file to PDF/DOCX parsing webhook with debug
export async function uploadKnowledgeBaseAs(
  file: File | Blob,
  metadata?: {
    filename?: string
    userId?: string
    agentId?: string
    description?: string
  }
): Promise<{
  success: boolean
  data?: any
  error?: string
  debugInfo?: any
}> {
  const webhookDebugger = WebhookDebugger.getInstance()
  const webhookUrl = API_ENDPOINTS.N8N_WEBHOOKS.UPLOAD_KNOWLEDGE_BASE_AS
  const startTime = Date.now()

  try {
    webhookDebugger.info('UPLOAD_KNOWLEDGE_BASE_AS', 'Starting file upload to webhook', {
      filename: metadata?.filename || 'unknown',
      fileSize: file.size,
      fileType: file.type,
      webhookUrl,
    })

    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file, metadata?.filename || 'document')
    
    if (metadata?.userId) {
      formData.append('userId', metadata.userId)
    }
    if (metadata?.agentId) {
      formData.append('agentId', metadata.agentId)
    }
    if (metadata?.description) {
      formData.append('description', metadata.description)
    }

    webhookDebugger.debug('UPLOAD_KNOWLEDGE_BASE_AS', 'FormData prepared', {
      hasFile: formData.has('file'),
      hasUserId: formData.has('userId'),
      hasAgentId: formData.has('agentId'),
      hasDescription: formData.has('description'),
    })

    // Make the request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary for FormData
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    webhookDebugger.info('UPLOAD_KNOWLEDGE_BASE_AS', 'Webhook response received', {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: DEBUG_CONFIG.WEBHOOK_DEBUG.LOG_RESPONSE_HEADERS ? 
        Object.fromEntries(response.headers.entries()) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      webhookDebugger.error('UPLOAD_KNOWLEDGE_BASE_AS', 'Webhook request failed', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      
      return {
        success: false,
        error: `Webhook request failed: ${response.status} ${response.statusText}`,
        debugInfo: {
          status: response.status,
          statusText: response.statusText,
          errorText,
          duration,
        },
      }
    }

    const responseData = await response.json()
    
    webhookDebugger.info('UPLOAD_KNOWLEDGE_BASE_AS', 'File upload completed successfully', {
      responseData: DEBUG_CONFIG.WEBHOOK_DEBUG.LOG_RESPONSE_BODY ? responseData : 'Response logged (disabled)',
      duration: `${duration}ms`,
    })

    return {
      success: true,
      data: responseData,
      debugInfo: {
        duration,
        status: response.status,
        responseSize: JSON.stringify(responseData).length,
      },
    }

  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime

    webhookDebugger.error('UPLOAD_KNOWLEDGE_BASE_AS', 'Webhook request error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debugInfo: {
        error: error instanceof Error ? error.message : String(error),
        duration,
      },
    }
  }
}

// Export debugger instance for external use
export const webhookDebugger = WebhookDebugger.getInstance()
