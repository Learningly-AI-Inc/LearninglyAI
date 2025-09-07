import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getOpenAIClient } from './openai';

// Initialize the Google Generative AI client with the API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');

// Get the Gemini model (using 2.5 Flash for best performance/value)
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export interface AIRequest {
  text: string;
  tone?: string;
  action: 'paraphrase' | 'grammar' | 'shorten' | 'expand';
  percentage?: number; // For length adjustments
  userId?: string;
}

export interface AIResponse {
  result: string;
  grammarIssues?: GrammarIssue[];
  id: string;
}

export interface GrammarIssue {
  id: string;
  original: string;
  suggestion: string;
  type: "grammar" | "spelling" | "style" | "clarity";
  description: string;
}

// Function to log AI API calls to the database
export async function logAIModelCall(
  userId: string, 
  modelName: 'gemini' | 'openai' | 'gpt-5', 
  requestPayload: any, 
  responsePayload: any
) {
  try {
    // In production, this would insert the log into the ai_model_logs table
    console.log('Logging AI model call:', {
      userId,
      modelName,
      requestPayload,
      responsePayload
    });
    return true;
  } catch (error) {
    console.error('Error logging AI model call:', error);
    return false;
  }
}

// Function for paraphrasing text with a specific tone using GPT-5
async function paraphraseText(text: string, tone: string = 'formal'): Promise<string> {
  try {
    const prompt = `You are a highly skilled assistant trained to paraphrase text. Please follow the instructions carefully:

1. **Maintain the Original Meaning**: Ensure that the paraphrased version retains the same meaning, context, and intent as the original text.
2. **Keep Length Similar**: The length of the paraphrased text should remain approximately the same as the original. Do not significantly shorten or lengthen the content.
3. **Natural and Clear**: Ensure that the paraphrased text sounds natural, coherent, and fluid. It should be easy to read and understand.
4. **Optional Tone Adjustment**: If the user specifies, you may adjust the tone of the text (e.g., formal, casual, academic, etc.) but without altering the meaning.
5. **Preserve Key Concepts**: Retain important terminology, facts, and concepts from the original text, especially if it's technical or factual content.
6. **Use Markdown Formatting**: When appropriate, use markdown formatting to enhance readability (e.g., **bold** for emphasis, *italics* for stress, lists, etc.).

Paraphrase the following text using a ${tone} tone:

"${text}"`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 2000
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from GPT-5');
    }
    
    return result.trim();
  } catch (error) {
    console.error('Error paraphrasing text with GPT-5:', error);
    throw new Error('Failed to paraphrase text');
  }
}

// Function for grammar checking
async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  try {
    const prompt = `Analyze the following text for grammar, spelling, style, and clarity issues. 
    For each issue found, provide:
    1. The problematic text
    2. A suggested correction
    3. The type of issue (grammar, spelling, style, or clarity)
    4. A brief explanation of the issue
    
    Format your response as a JSON array with the following structure:
    [
      {
        "original": "problem text",
        "suggestion": "corrected text",
        "type": "grammar|spelling|style|clarity",
        "description": "explanation of the issue"
      }
    ]
    
    If no issues are found, return an empty array: []
    
    Text to analyze:
    "${text}"`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    try {
      // Extract JSON from response text (handle potential non-JSON wrapping)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const issues: Omit<GrammarIssue, 'id'>[] = JSON.parse(jsonStr);
        
        // Add IDs to each issue
        return issues.map(issue => ({
          ...issue,
          id: uuidv4()
        }));
      }
      return [];
    } catch (parseError) {
      console.error('Error parsing grammar check response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error checking grammar:', error);
    return [];
  }
}

// Function for shortening text
async function shortenText(text: string, percentage: number = 50): Promise<string> {
  try {
    // Calculate target word count
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const targetWordCount = Math.ceil(wordCount * (1 - percentage / 100));
    
    const prompt = `Summarize the following text to make it more concise while preserving the key information and meaning.
    
    Original text (${wordCount} words):
    "${text}"
    
    Shorter version (target: about ${targetWordCount} words):`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error shortening text:', error);
    throw new Error('Failed to shorten text');
  }
}

// Function for expanding text
async function expandText(text: string, percentage: number = 50): Promise<string> {
  try {
    // Calculate target word count
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const targetWordCount = Math.ceil(wordCount * (1 + percentage / 100));
    
    const prompt = `Expand the following text to provide more detail, examples, or context while maintaining the original meaning.
    
    Original text (${wordCount} words):
    "${text}"
    
    Expanded version (target: about ${targetWordCount} words):`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error expanding text:', error);
    throw new Error('Failed to expand text');
  }
}

// Main processing function that handles all types of AI requests
export async function processWithAI(request: AIRequest): Promise<AIResponse> {
  const { text, tone = 'formal', action, percentage = 50, userId } = request;
  
  try {
    let result = '';
    let grammarIssues: GrammarIssue[] = [];
    
    switch (action) {
      case 'paraphrase':
        result = await paraphraseText(text, tone);
        break;
      case 'grammar':
        grammarIssues = await checkGrammar(text);
        result = text; // Return original text
        break;
      case 'shorten':
        result = await shortenText(text, percentage);
        break;
      case 'expand':
        result = await expandText(text, percentage);
        break;
      default:
        result = text;
    }
    
    // Log the AI model call if a userId is provided
    if (userId) {
      const modelName = action === 'paraphrase' ? 'gpt-5' : 'gemini';
      await logAIModelCall(
        userId,
        modelName,
        request,
        { result, grammarIssues: action === 'grammar' ? grammarIssues : undefined }
      );
    }
    
    return {
      result,
      grammarIssues: action === 'grammar' ? grammarIssues : undefined,
      id: uuidv4()
    };
  } catch (error) {
    console.error(`Error processing AI request (${action}):`, error);
    throw new Error(`Failed to process ${action} request`);
  }
}