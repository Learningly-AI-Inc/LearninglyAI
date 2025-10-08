/**
 * Document Processing Optimization Utilities
 *
 * This module provides intelligent text compression, chunking, and optimization
 * for faster document processing and AI generation.
 */

export interface CompressedDocument {
  original: string;
  compressed: string;
  compressionRatio: number;
  sections: TextSection[];
  keyPhrases: string[];
  estimatedTokens: number;
}

export interface TextSection {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  importance: number; // 0-1 score
  wordCount: number;
}

export interface ChunkOptions {
  maxChunkSize?: number; // Max characters per chunk
  overlap?: number; // Overlap between chunks
  preserveSentences?: boolean;
}

/**
 * Compress document text by removing redundant content while preserving meaning
 */
export function compressText(text: string, targetRatio: number = 0.5): string {
  if (!text || text.length === 0) return text;

  // Remove multiple spaces and normalize whitespace
  let compressed = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  // Remove common filler words for further compression if needed
  if (compressed.length / text.length > targetRatio) {
    const fillerPatterns = [
      /\b(um|uh|like|you know|basically|actually|literally)\b/gi,
      /\(.*?\)/g, // Remove parenthetical content
      /\[.*?\]/g, // Remove bracketed content
    ];

    for (const pattern of fillerPatterns) {
      compressed = compressed.replace(pattern, '');
    }

    // Clean up any double spaces created
    compressed = compressed.replace(/\s+/g, ' ').trim();
  }

  return compressed;
}

/**
 * Extract key sentences from text (extractive summarization)
 */
export function extractKeySentences(text: string, maxSentences: number = 20): string[] {
  if (!text) return [];

  // Split into sentences (improved regex)
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 20) // Filter out very short sentences
    .map(s => s.trim());

  if (sentences.length <= maxSentences) {
    return sentences;
  }

  // Score sentences based on importance indicators
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;

    // Position bonus (beginning and end are often important)
    if (index < 3) score += 2;
    if (index >= sentences.length - 3) score += 1;

    // Length bonus (medium-length sentences often more informative)
    const words = sentence.split(/\s+/).length;
    if (words >= 10 && words <= 30) score += 1;

    // Keyword presence
    const keywords = /\b(important|significant|key|main|primary|essential|critical|conclusion|summary|result|finding)\b/gi;
    const matches = sentence.match(keywords);
    if (matches) score += matches.length;

    // Number presence (often indicates data/facts)
    if (/\d+/.test(sentence)) score += 0.5;

    // Question sentences (often important)
    if (sentence.includes('?')) score += 1;

    return { sentence, score, index };
  });

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index) // Re-sort by original order
    .map(s => s.sentence);

  return topSentences;
}

/**
 * Create an intelligent summary of the document for AI processing
 */
export function createIntelligentSummary(text: string, maxLength: number = 4000): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Strategy: Extract key sentences and combine them
  const targetSentenceCount = Math.ceil(maxLength / 200); // Assume ~200 chars per sentence
  const keySentences = extractKeySentences(text, targetSentenceCount);

  let summary = keySentences.join(' ');

  // If still too long, compress further
  if (summary.length > maxLength) {
    summary = compressText(summary, maxLength / summary.length);
  }

  // If still too long, truncate intelligently at sentence boundary
  if (summary.length > maxLength) {
    const truncated = summary.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.8) {
      summary = truncated.substring(0, lastPeriod + 1);
    } else {
      summary = truncated;
    }
  }

  return summary.trim();
}

/**
 * Split text into chunks for processing
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextSection[] {
  const {
    maxChunkSize = 3000,
    overlap = 200,
    preserveSentences = true
  } = options;

  if (!text || text.length === 0) return [];

  const chunks: TextSection[] = [];
  let startIndex = 0;
  let chunkId = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + maxChunkSize, text.length);

    // If preserveSentences is true, try to end at a sentence boundary
    if (preserveSentences && endIndex < text.length) {
      const substring = text.substring(startIndex, endIndex);
      const lastPeriod = substring.lastIndexOf('.');
      const lastQuestion = substring.lastIndexOf('?');
      const lastExclamation = substring.lastIndexOf('!');
      const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclamation);

      // Only use sentence boundary if it's not too far back
      if (lastBoundary > maxChunkSize * 0.7) {
        endIndex = startIndex + lastBoundary + 1;
      }
    }

    const content = text.substring(startIndex, endIndex).trim();
    const wordCount = content.split(/\s+/).length;

    chunks.push({
      id: `chunk-${chunkId}`,
      content,
      startIndex,
      endIndex,
      importance: 1, // Can be calculated based on content
      wordCount
    });

    // Move to next chunk with overlap
    startIndex = endIndex - overlap;
    if (startIndex >= text.length - overlap) {
      break; // Avoid tiny last chunk
    }
    chunkId++;
  }

  return chunks;
}

/**
 * Estimate token count for OpenAI API
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Optimize document for AI processing
 */
export function optimizeForAI(text: string, maxTokens: number = 3000): CompressedDocument {
  const maxChars = maxTokens * 4; // Convert tokens to approximate characters

  // If text is already small enough, return as-is
  if (text.length <= maxChars) {
    return {
      original: text,
      compressed: text,
      compressionRatio: 1,
      sections: [{
        id: 'full',
        content: text,
        startIndex: 0,
        endIndex: text.length,
        importance: 1,
        wordCount: text.split(/\s+/).length
      }],
      keyPhrases: extractKeyPhrases(text, 10),
      estimatedTokens: estimateTokens(text)
    };
  }

  // Create intelligent summary
  const compressed = createIntelligentSummary(text, maxChars);

  // Extract key phrases for context
  const keyPhrases = extractKeyPhrases(text, 20);

  // Create sections for reference
  const sections = chunkText(text, { maxChunkSize: 2000, overlap: 100 });

  return {
    original: text,
    compressed,
    compressionRatio: compressed.length / text.length,
    sections,
    keyPhrases,
    estimatedTokens: estimateTokens(compressed)
  };
}

/**
 * Extract key phrases from text
 */
export function extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
  if (!text) return [];

  // Simple extraction: find capitalized words and common important patterns
  const phrases: string[] = [];

  // Extract capitalized phrases (2-4 words)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;
  const capitalizedMatches = text.match(capitalizedPattern) || [];
  phrases.push(...capitalizedMatches);

  // Extract quoted text
  const quotedPattern = /"([^"]+)"/g;
  let match;
  while ((match = quotedPattern.exec(text)) !== null) {
    phrases.push(match[1]);
  }

  // Count occurrences and return most frequent
  const phraseCounts = new Map<string, number>();
  for (const phrase of phrases) {
    const normalized = phrase.trim().toLowerCase();
    if (normalized.length > 3) { // Skip very short phrases
      phraseCounts.set(normalized, (phraseCounts.get(normalized) || 0) + 1);
    }
  }

  // Sort by frequency and return top phrases
  const sortedPhrases = Array.from(phraseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(([phrase]) => phrase);

  return sortedPhrases;
}

/**
 * Process large document in chunks with a callback for progress
 */
export async function processDocumentInChunks<T>(
  text: string,
  processor: (chunk: TextSection, index: number, total: number) => Promise<T>,
  options: ChunkOptions = {}
): Promise<T[]> {
  const chunks = chunkText(text, options);
  const results: T[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const result = await processor(chunks[i], i, chunks.length);
    results.push(result);
  }

  return results;
}
