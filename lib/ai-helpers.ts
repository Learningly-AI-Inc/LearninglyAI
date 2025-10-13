import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getOpenAIClient, DEFAULT_MODEL } from './openai';

// Initialize the Google Generative AI client with the API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');

// Get the Gemini model for general tasks (using 2.5 Flash for best performance/value)
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Get the Gemini Pro model specifically for grammar checking (more accurate)
const geminiProModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
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
    console.log(responsePayload.grammarIssues);
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
- IMPORTANT: Preserve all paragraph breaks and line breaks from the original text. Use double newlines (\\n\\n) to separate paragraphs.
- Output plain text only (no quotes, no lists, no headings, no markdown formatting).`;

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
    // Use a more focused and effective prompt
    const prompt = `You are a professional English grammar and spelling checker. Your job is to find ALL errors in the text below.

CHECK FOR THESE ERRORS (check EVERY word):
1. Spelling mistakes (like "dreamz" → "dreams", "peeple" → "people", "becaus" → "because")
2. Verb tense errors (like "I visit NYC" → "I visited NYC" when talking about the past)
3. Missing or incorrect articles (a/an/the)
4. Subject-verb agreement (like "building are" → "buildings are" or "people gets" → "people get")
5. Missing words (like "you tired" → "you're tired")
6. Wrong word usage (like "then" → "than")
7. Punctuation (missing apostrophes, commas, etc.)
8. Capitalization errors

CRITICAL: You MUST find ALL errors. Check EVERY sentence carefully, word by word.

For each error found, return JSON in this exact format:
[
  {
    "original": "exact wrong text from input",
    "suggestion": "corrected text",
    "type": "spelling" or "grammar" or "style" or "clarity",
    "description": "brief explanation"
  }
]

RULES:
- Group errors that are next to each other (e.g., "dreamz comes" → "dreams come")
- Report separate errors in different parts of the sentence as separate items
- Be thorough - if a text has many obvious errors, you should find 20+ issues
- Return ONLY the JSON array, nothing else

TEXT TO CHECK:
"${text}"

Return the JSON array with ALL errors found:`;

    // Use Gemini Pro for better accuracy on grammar checking
    const result = await geminiProModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent, focused results
        maxOutputTokens: 8192, // Ensure we can return many errors
      },
    });

    const response = await result.response;
    let responseText = response.text().trim();

    console.log(`📊 Grammar check response length: ${responseText.length} characters`);

    try {
      // First, try to strip markdown code blocks if present
      let cleanedText = responseText;

      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      // Check if response starts with markdown block but might be truncated
      if (cleanedText.startsWith('```')) {
        // Find the opening block
        const startMatch = cleanedText.match(/^```(?:json)?\s*/);
        if (startMatch) {
          // Remove opening marker
          cleanedText = cleanedText.substring(startMatch[0].length);

          // Check if closing marker exists
          if (cleanedText.includes('```')) {
            // Has proper closing, extract content
            const endIndex = cleanedText.indexOf('```');
            cleanedText = cleanedText.substring(0, endIndex);
          } else {
            // No closing marker - response was truncated, just use what we have
            console.warn('⚠️ Response appears truncated (missing closing ```)');
          }
          console.log('✓ Stripped markdown code blocks from response');
        }
      }

      cleanedText = cleanedText.trim();

      // Try to repair incomplete JSON if needed
      if (cleanedText.startsWith('[') && !cleanedText.endsWith(']')) {
        console.warn('⚠️ JSON array not properly closed, attempting to repair...');

        // Find the last complete object
        let lastCompleteIndex = cleanedText.lastIndexOf('}');
        if (lastCompleteIndex > 0) {
          // Truncate to last complete object and close the array
          cleanedText = cleanedText.substring(0, lastCompleteIndex + 1) + '\n]';
          console.log('✓ Repaired incomplete JSON array');
        }
      }

      // Now try to extract JSON array from the cleaned text
      let jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // If still no match, try to find it in the original response
        jsonMatch = responseText.match(/\[[\s\S]*\]/);
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const issues: Omit<GrammarIssue, 'id'>[] = JSON.parse(jsonStr);

        console.log(`✓ Found ${issues.length} grammar issues from Gemini Pro`);

        if (issues.length === 0) {
          console.log('AI returned empty array - text might be error-free');
          return [];
        }

        // Add IDs to each issue and validate
        const validatedIssues = issues
          .filter(issue => {
            // Ensure we have both original and suggestion text, and they're different
            const isValid = issue.original &&
                   issue.suggestion &&
                   issue.original.trim() !== '' &&
                   issue.suggestion.trim() !== '' &&
                   issue.original.trim() !== issue.suggestion.trim();

            if (!isValid) {
              console.log('Filtered out invalid issue:', issue);
            }
            return isValid;
          })
          .map(issue => {
            // Normalize issue type to match our expected values
            const normalizedType = normalizeIssueType(issue.type);
            return {
              ...issue,
              original: issue.original.trim(),
              suggestion: issue.suggestion.trim(),
              type: normalizedType,
              description: issue.description || 'Needs correction',
              id: uuidv4()
            };
          });

        console.log(`✓ Validated ${validatedIssues.length} grammar issues for return`);

        if (validatedIssues.length === 0) {
          console.warn('WARNING: All issues were filtered out during validation');
        }

        return validatedIssues;
      }

      console.error('ERROR: No JSON array found in AI response');
      console.error('Response length:', responseText.length);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      console.error('Response text (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
      throw new Error('AI did not return valid JSON format');
    } catch (parseError) {
      console.error('ERROR: Failed to parse grammar check response:', parseError);
      console.error('Response length:', responseText.length);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      console.error('Response text (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));

      // If parsing failed, try one more time with a more aggressive cleanup
      try {
        console.log('🔧 Attempting aggressive JSON repair...');

        // Strip all markdown formatting
        let repairedText = responseText.replace(/```[a-z]*\n?/g, '').trim();

        // If it starts with [ but doesn't end with ], try to repair it
        if (repairedText.startsWith('[') && !repairedText.endsWith(']')) {
          // Find the last complete object
          const lastBraceIndex = repairedText.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            repairedText = repairedText.substring(0, lastBraceIndex + 1) + '\n]';
            console.log('✓ Repaired incomplete JSON array in fallback');
          }
        }

        const lastArrayMatch = repairedText.match(/\[[\s\S]*\]/);
        if (lastArrayMatch) {
          const issues: Omit<GrammarIssue, 'id'>[] = JSON.parse(lastArrayMatch[0]);
          console.log(`✓ Successfully parsed JSON after aggressive cleanup (${issues.length} issues)`);
          return issues.map(issue => ({
            ...issue,
            original: issue.original.trim(),
            suggestion: issue.suggestion.trim(),
            type: normalizeIssueType(issue.type),
            description: issue.description || 'Needs correction',
            id: uuidv4()
          }));
        }
      } catch (retryError) {
        console.error('ERROR: Retry parsing also failed:', retryError);
      }

      throw parseError;
    }
  } catch (error) {
    console.error('ERROR in checkGrammar function:', error);
    throw error;
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
    const response = result.response;
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
    const response = result.response;
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
      let modelName: 'gemini' | 'openai' | 'gpt-5' | 'trinka' = 'gemini';
      if (action === 'paraphrase') {
        modelName = 'openai';
      } else if (action === 'grammar') {
        modelName = 'gemini'; // Using LanguageTool + Gemini fallback
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