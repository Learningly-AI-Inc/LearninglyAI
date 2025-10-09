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
    const prompt = `You are an EXTREMELY STRICT English grammar and spelling checker. You MUST find and report EVERY SINGLE ERROR, no matter how minor.

CRITICAL INSTRUCTIONS - YOU MUST CHECK ALL OF THE FOLLOWING:
1. SPELLING: Check EVERY word for typos and misspellings (dreamz→dreams, becaus→because, advertizements→advertisements, pretzals→pretzels, picturs→pictures, restarant→restaurant, expensiv→expensive, concret→concrete, energi→energy)
2. VERB TENSE: Check EVERY verb for correct tense (visit→visited, is call→is called, I feel→I felt)
3. SUBJECT-VERB AGREEMENT: Check EVERY subject-verb pair (building are→buildings are, I visit→I visited, subway is→subway is)
4. ARTICLES: Check for missing or incorrect articles (a/an/the)
5. PUNCTUATION: Check for missing commas, periods, apostrophes, quotes
6. CAPITALIZATION: Check first letter of sentences and proper nouns
7. SINGULAR/PLURAL: Check noun agreement (building→buildings when plural needed)
8. PREPOSITIONS: Check correct preposition usage and word order
9. WORD CHOICE: Check commonly confused words (then→than, their→there→they're, your→you're)
10. MISSING WORDS: Check for missing helper verbs, pronouns, conjunctions (you tired→you're tired, when first time→when the first time)

For EVERY SINGLE ERROR you find (no matter how small), report it in this EXACT JSON format:
[
  {
    "original": "exact wrong text from the original",
    "suggestion": "corrected version",
    "type": "spelling" or "grammar" or "style" or "clarity",
    "description": "clear explanation of what's wrong"
  }
]

CRITICAL EXAMPLES you MUST catch:
- "dreamz" → "dreams" (spelling)
- "becaus light is" → "because lights are" (spelling + grammar)
- "I visit NYC" → "I visited NYC" (grammar: wrong tense)
- "building are touching" → "buildings are touching" (grammar: plural agreement)
- "is call" → "is called" (grammar: passive voice)
- "first time I visit" → "first time I visited" (grammar: past tense)
- "I feel like" → "I felt like" (grammar: past tense consistency)
- "advertizements" → "advertisements" (spelling)
- "then sun sometime" → "than sun sometimes" (spelling + word choice)
- "picturs" → "pictures" (spelling)
- "characters" → "characters" (spelling)
- "energi" → "energy" (spelling)
- "make you feel alive even when you tired" → "make you feel alive even when you're tired" (grammar: missing verb)
- "concret" → "concrete" (spelling)
- "jog, sit on benches" → OK (this is correct)
- "lay down" → "lie down" (grammar: lay vs lie)
- "cover the trees" → "covers the trees" (grammar: subject-verb agreement)
- "kids sliding" → OK (this is correct)
- "concerts happen" → OK (this is correct)
- "expensiv" → "expensive" (spelling)
- "restarant" → "restaurant" (spelling)
- "then rent" → "than rent" (word choice: then vs than)
- "vendors sell" → OK (this is correct)
- "pretzals" → "pretzels" (spelling)

TEXT TO CHECK (READ EVERY WORD CAREFULLY):
"${text}"

YOU MUST RETURN ONLY THE JSON ARRAY. NO EXPLANATORY TEXT BEFORE OR AFTER.

IMPORTANT REMINDER:
- Go through the text WORD BY WORD
- Check EACH sentence for ALL 10 error types listed above
- Be EXTREMELY thorough - even if it takes time
- Do NOT skip any words or sentences
- ONLY return the JSON array with all errors found`;

    // First pass - comprehensive check
    const result = await geminiModel.generateContent(prompt, {
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent, thorough checking
        topK: 1,
        topP: 0.95,
      }
    });
    const response = await result.response;
    let responseText = response.text().trim();

    try {
      // Extract JSON from response text (handle potential non-JSON wrapping)
      let jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Try to find JSON in markdown code blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        }
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const issues: Omit<GrammarIssue, 'id'>[] = JSON.parse(jsonStr);

        console.log(`Found ${issues.length} grammar issues from AI`);

        // Add IDs to each issue and validate
        const validatedIssues = issues
          .filter(issue => {
            // Ensure we have both original and suggestion text, and they're different
            return issue.original &&
                   issue.suggestion &&
                   issue.original.trim() !== '' &&
                   issue.suggestion.trim() !== '' &&
                   issue.original.trim() !== issue.suggestion.trim();
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

        console.log(`Validated ${validatedIssues.length} grammar issues`);
        return validatedIssues;
      }
      console.log('No JSON match found in response');
      return [];
    } catch (parseError) {
      console.error('Error parsing grammar check response:', parseError);
      console.error('Response text:', responseText);
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