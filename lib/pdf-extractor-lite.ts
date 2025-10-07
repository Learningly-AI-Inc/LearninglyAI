/**
 * Lightweight PDF Text Extraction Utility
 * Works without Adobe SDK dependencies
 */

export interface ExtractionResult {
  text: string;
  pages: number;
  method: 'pdfjs' | 'pdf-parse' | 'fallback';
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ExtractionOptions {
  maxPages?: number;
  timeout?: number;
  preferClientSide?: boolean;
}

// Dynamic imports to avoid compilation issues
let pdfjsLib: any = null;

// Configure PDF.js worker only in browser
if (typeof window !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch (error) {
    console.warn('PDF.js not available:', error);
  }
}

/**
 * Client-side PDF text extraction using PDF.js
 * Fastest method for browser environments
 */
export async function extractTextWithPDFJS(
  file: File | ArrayBuffer | any,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const { maxPages = 0, timeout = 30000 } = options;

  try {
    if (!pdfjsLib) {
      throw new Error('PDF.js not available');
    }

    let arrayBuffer: ArrayBuffer;
    
    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else if (file instanceof Buffer) {
      arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } else {
      arrayBuffer = file;
    }

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Reduce logging for performance
    }).promise;

    const numPages = Math.min(pdf.numPages, maxPages || pdf.numPages);
    let fullText = '';
    
    // Process pages in parallel for better performance
    const pagePromises = [];
    for (let i = 1; i <= numPages; i++) {
      pagePromises.push(
        pdf.getPage(i).then(async (page: any) => {
          const textContent = await page.getTextContent();
          return textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        })
      );
    }

    const pageTexts = await Promise.all(pagePromises);
    fullText = pageTexts.join('\n\n').trim();

    return {
      text: fullText || 'No extractable text found in PDF',
      pages: numPages,
      method: 'pdfjs',
      processingTime: Date.now() - startTime,
      success: !!fullText,
    };
  } catch (error: any) {
    return {
      text: '',
      pages: 0,
      method: 'pdfjs',
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message || 'PDF.js extraction failed',
    };
  }
}

/**
 * Server-side PDF text extraction using pdf-parse
 * Fallback method for server environments
 */
export async function extractTextWithPDFParse(
  buffer: any,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const { timeout = 15000 } = options;

  try {
    const { default: PDFParse } = await import('pdf-parse');
    
    const parsePromise = PDFParse(buffer, {
      max: options.maxPages || 0,
      version: 'v1.10.100', // Use stable version
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('PDF parsing timeout')), timeout);
    });

    const pdfData = await Promise.race([parsePromise, timeoutPromise]) as any;
    
    return {
      text: String(pdfData.text || '').trim(),
      pages: pdfData.numpages || 1,
      method: 'pdf-parse',
      processingTime: Date.now() - startTime,
      success: !!pdfData.text,
    };
  } catch (error: any) {
    return {
      text: '',
      pages: 0,
      method: 'pdf-parse',
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message || 'pdf-parse extraction failed',
    };
  }
}

/**
 * Smart PDF text extraction with automatic fallbacks
 * Tries multiple methods in order of preference
 */
export async function extractPDFText(
  file: File | ArrayBuffer | any,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { preferClientSide = true } = options;
  
  // Try client-side extraction first (fastest)
  if (preferClientSide && typeof window !== 'undefined') {
    const result = await extractTextWithPDFJS(file, options);
    if (result.success && result.text.length > 100) {
      return result;
    }
  }

  // Try server-side methods
  if (typeof window === 'undefined' || file instanceof Buffer) {
    const buffer = file instanceof Buffer ? file : Buffer.from(file as ArrayBuffer);
    
    // Try pdf-parse
    const parseResult = await extractTextWithPDFParse(buffer, options);
    if (parseResult.success && parseResult.text.length > 100) {
      return parseResult;
    }
  }

  // Final fallback
  return {
    text: 'This PDF appears to be image-based or contains no extractable text. The document will display visually for reading and analysis, but AI chat features may be limited without searchable text.',
    pages: 1,
    method: 'fallback',
    processingTime: 0,
    success: false,
    error: 'All extraction methods failed',
  };
}

/**
 * Validate PDF file before processing
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > 100 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 100MB limit' };
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must be a PDF' };
  }

  return { valid: true };
}

/**
 * Estimate processing time based on file size
 */
export function estimateProcessingTime(fileSize: number): number {
  // Rough estimation: 1 second per MB for small files, 0.5 seconds per MB for larger files
  const sizeInMB = fileSize / (1024 * 1024);
  if (sizeInMB < 5) {
    return Math.max(2, sizeInMB * 1);
  } else {
    return Math.max(5, sizeInMB * 0.5);
  }
}
