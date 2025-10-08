import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getOpenAIClient, DEFAULT_MODEL } from './openai';

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
  modelName: 'gemini' | 'openai' | 'gpt-5' | 'trinka', 
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

// Function for paraphrasing text with a specific tone using OpenAI, with Gemini fallback if unchanged
async function paraphraseText(text: string, tone: string = 'formal'): Promise<string> {
  try {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '').trim();

    const systemPrompt = `You are a professional paraphraser. Rewrite text while preserving meaning.
Requirements:
- Keep a ${tone} tone.
- Do not copy any sentence verbatim; restructure phrasing.
- Maintain roughly the same length.
- Output plain text only (no quotes, no lists, no headings).`;

    const userPrompt = `Paraphrase this:
${text}`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: 2000
    });

    let result = completion.choices[0]?.message?.content?.trim() || '';
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // If the result is effectively identical to the input, try a Gemini fallback
    if (normalize(result) === normalize(text)) {
      const fallbackPrompt = `Rewrite the following text in a ${tone} tone. Do not repeat sentences verbatim. Change wording and sentence structure while keeping the same meaning. Return plain text only.\n\n${text}`;
      const geminiRes = await geminiModel.generateContent(fallbackPrompt);
      const geminiText = (await geminiRes.response.text()).trim();
      if (geminiText && normalize(geminiText) !== normalize(text)) {
        return geminiText;
      }
    }

    return result;
  } catch (error) {
    console.error('Error paraphrasing text:', error);
    throw new Error('Failed to paraphrase text');
  }
}

// Function to normalize issue types to our expected values
function normalizeIssueType(type: string): "grammar" | "spelling" | "style" | "clarity" {
  if (!type) return 'grammar';
  
  const normalizedType = type.toLowerCase().trim();
  
  // Map various possible issue types to our four categories
  if (normalizedType.includes('spell') || normalizedType.includes('typo') || normalizedType.includes('misspell')) {
    return 'spelling';
  }
  
  if (normalizedType.includes('style') || normalizedType.includes('word choice') || normalizedType.includes('tone') || 
      normalizedType.includes('formal') || normalizedType.includes('informal') || normalizedType.includes('repetition')) {
    return 'style';
  }
  
  if (normalizedType.includes('clarity') || normalizedType.includes('unclear') || normalizedType.includes('confusing') ||
      normalizedType.includes('ambiguous') || normalizedType.includes('vague')) {
    return 'clarity';
  }
  
  // Default to grammar for everything else (grammar, syntax, punctuation, etc.)
  return 'grammar';
}

// Function for comprehensive grammar checking with multiple passes
async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  try {
    const prompt = `You are an expert grammar and style checker. Perform a COMPREHENSIVE analysis of the following text to identify ALL issues in a single pass.

    CRITICAL REQUIREMENTS:
    1. Find EVERY issue - don't miss any spelling, grammar, style, or clarity problems
    2. Be thorough and systematic - check each word, phrase, and sentence
    3. Include issues like: spelling errors, grammar mistakes, awkward phrasing, unclear sentences, style inconsistencies, punctuation errors, word choice issues, sentence structure problems
    4. For each issue, provide the EXACT problematic text as it appears in the original
    5. Give clear, concise suggestions that improve the text
    6. Categorize each issue accurately
    7. BE CONSISTENT - if you've already identified and fixed issues in this text, don't find new ones unless they are genuinely different problems

    For each issue found, provide:
    1. The exact problematic text (copy it precisely from the original)
    2. A suggested correction
    3. The type of issue - MUST be exactly one of: "grammar", "spelling", "style", or "clarity"
    4. A brief explanation of why this is an issue

    IMPORTANT: The "type" field must be exactly one of these four values:
    - "grammar": For grammar errors, syntax issues, punctuation problems
    - "spelling": For misspelled words, typos
    - "style": For word choice, tone, repetition, formality issues
    - "clarity": For unclear, confusing, or ambiguous sentences

    Format your response as a JSON array with the following structure:
    [
      {
        "original": "exact problematic text from original",
        "suggestion": "corrected text",
        "type": "grammar",
        "description": "brief explanation of the issue"
      }
    ]
    
    IMPORTANT: 
    - Find ALL issues in one comprehensive pass
    - Use the exact text from the original for "original" field
    - If no issues are found, return an empty array: []
    - Be systematic and thorough - don't rush the analysis
    - BE CONSISTENT - don't find new issues if the text has already been checked and fixed
    
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
        
        // Add IDs to each issue and validate
        const validatedIssues = issues
          .filter(issue => {
            // Ensure we have both original and suggestion text, and they're different
            return issue.original && 
                   issue.suggestion && 
                   issue.original.trim() !== '' && 
                   issue.suggestion.trim() !== '' && 
                   issue.original !== issue.suggestion;
          })
          .map(issue => {
            // Normalize issue type to match our expected values
            const normalizedType = normalizeIssueType(issue.type);
            return {
              ...issue,
              original: issue.original.trim(),
              suggestion: issue.suggestion.trim(),
              type: normalizedType,
              id: uuidv4()
            };
          });
        
        return validatedIssues;
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

// Trinka provider integration with safe fallback to Gemini
async function checkGrammarWithTrinka(text: string): Promise<GrammarIssue[]> {
  const trinkaApiKey = process.env.TRINKA_API_KEY || process.env.NEXT_PUBLIC_TRINKA_API_KEY || '';
  const trinkaEndpoint = process.env.TRINKA_API_URL_GRAMMAR || '';

  if (!trinkaApiKey || !trinkaEndpoint) {
    // Missing configuration; fall back to existing Gemini-based checker
    return await checkGrammar(text);
  }

  try {
    console.log('Trinka API Debug:', {
      endpoint: trinkaEndpoint,
      hasApiKey: !!trinkaApiKey,
      apiKeyLength: trinkaApiKey?.length,
      textLength: text.length
    });
    
    const response = await fetch(trinkaEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${trinkaApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    console.log('Trinka grammar API response:', response);
    if (!response.ok) {
      try {
        const errText = await response.text();
        console.error('Trinka grammar API error:', response.status, errText);
      } catch {
        console.error('Trinka grammar API error status:', response.status);
      }
      return await checkGrammar(text);
    }

    const data: any = await response.json();

    // Try to locate an issues array across common shapes
    const rawIssues: any[] = Array.isArray(data?.issues) ? data.issues
      : Array.isArray(data?.data?.issues) ? data.data.issues
      : Array.isArray(data?.results) ? data.results
      : Array.isArray(data) ? data
      : [];

    const mapped: GrammarIssue[] = rawIssues.map((issue: any) => {
      const originalCandidate = issue?.original ?? issue?.error ?? issue?.error_text ?? issue?.context ?? issue?.text ?? issue?.source ?? '';
      const suggestionCandidate = issue?.suggestion ?? issue?.replacement ?? issue?.fix ?? issue?.correction ?? issue?.target ?? '';
      const typeCandidate = String((issue?.type ?? issue?.category ?? issue?.issue_type ?? 'grammar')).toLowerCase();
      const descriptionCandidate = issue?.description ?? issue?.message ?? issue?.explanation ?? issue?.reason ?? '';

      const normalizedType = normalizeIssueType(typeCandidate);

      const originalStr = String(originalCandidate || '').trim();
      const suggestionStr = String((suggestionCandidate || originalCandidate || '')).trim();

      return {
        id: uuidv4(),
        original: originalStr,
        suggestion: suggestionStr,
        type: normalizedType,
        description: String(descriptionCandidate || '').trim()
      } as GrammarIssue;
    }).filter((gi: GrammarIssue) => {
      // Ensure we have both original and suggestion text, and they're different
      return gi.original && 
             gi.suggestion && 
             gi.original.trim() !== '' && 
             gi.suggestion.trim() !== '' && 
             gi.original !== gi.suggestion;
    });

    return mapped;
  } catch (error) {
    console.error('Error calling Trinka grammar API:', error);
    return await checkGrammar(text);
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
        if ((process.env.TRINKA_API_KEY || process.env.NEXT_PUBLIC_TRINKA_API_KEY) && process.env.TRINKA_API_URL_GRAMMAR) {
          grammarIssues = await checkGrammarWithTrinka(text);
        } else {
          grammarIssues = await checkGrammar(text);
        }
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
      let modelName: 'gemini' | 'openai' | 'gpt-5' | 'trinka' = 'gemini';
      if (action === 'paraphrase') {
        modelName = 'openai';
      } else if (action === 'grammar' && ((process.env.TRINKA_API_KEY || process.env.NEXT_PUBLIC_TRINKA_API_KEY) && process.env.TRINKA_API_URL_GRAMMAR)) {
        modelName = 'trinka';
      }
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