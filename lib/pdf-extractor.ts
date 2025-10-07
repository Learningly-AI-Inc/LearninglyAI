/**
 * Optimized PDF Text Extraction Utility
 * Handles multiple extraction methods with fallbacks for better performance
 */

// Dynamic imports to avoid compilation issues
let pdfjsLib: any = null;
let PDFDocument: any = null;

// Configure PDF.js worker only in browser
if (typeof window !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch (error) {
    console.warn('PDF.js not available:', error);
  }
}

export interface ExtractionResult {
  text: string;
  pages: number;
  method: 'pdfjs' | 'pdf-parse' | 'adobe' | 'fallback';
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ExtractionOptions {
  maxPages?: number;
  timeout?: number;
  preferClientSide?: boolean;
  enableOCR?: boolean;
}

/**
 * Client-side PDF text extraction using PDF.js
 * Fastest method for browser environments
 */
export async function extractTextWithPDFJS(
  file: File | ArrayBuffer | Buffer,
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
 * Adobe PDF Services extraction (server-side only)
 * Highest quality but requires API credentials
 */
export async function extractTextWithAdobe(
  buffer: any,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Check if Adobe SDK is available using dynamic import
    let sdk: any;
    let mammoth: any;
    
    try {
      // Use eval to avoid TypeScript compile-time checking
      sdk = await eval('import("@adobe/pdfservices-node-sdk")');
      mammoth = await eval('import("mammoth")');
    } catch (importError) {
      // Adobe SDK is optional - return early with a clear message
      return {
        text: '',
        pages: 0,
        method: 'adobe',
        processingTime: Date.now() - startTime,
        success: false,
        error: 'Adobe PDF Services SDK not installed. Install with: npm install @adobe/pdfservices-node-sdk mammoth',
      };
    }

    const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Adobe PDF Services credentials not configured');
    }

    const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret });
    const pdfServices = new sdk.PDFServices({ credentials });

    // Convert buffer to readable stream
    const { Readable } = await import('stream');
    const readStream = Readable.from(buffer);

    const inputAsset = await pdfServices.upload({ 
      readStream, 
      mimeType: sdk.MimeType.PDF 
    });

    // Export to DOCX for better text extraction
    const exportParams = new sdk.ExportPDFParams({
      targetFormat: sdk.ExportPDFTargetFormat.DOCX,
      ocrLocale: sdk.ExportOCRLocale.EN_US,
    });

    const exportJob = new sdk.ExportPDFJob({ inputAsset, params: exportParams });
    const exportResult = await pdfServices.submit({ job: exportJob });

    // Wait for job completion
    let jobStatus = await pdfServices.getJobStatus({ jobId: exportResult.jobId });
    while (jobStatus.status === sdk.JobStatus.IN_PROGRESS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      jobStatus = await pdfServices.getJobStatus({ jobId: exportResult.jobId });
    }

    if (jobStatus.status !== sdk.JobStatus.DONE) {
      throw new Error(`Adobe export failed: ${jobStatus.status}`);
    }

    // Download and extract text from DOCX
    const streamAsset = await pdfServices.downloadStream({ asset: jobStatus.result.asset });
    const chunks: any[] = [];
    const stream = streamAsset.readStream;
    
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    // Concatenate chunks safely
    const docxBuffer = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
    const { value } = await mammoth.extractRawText({ buffer: docxBuffer });
    
    return {
      text: String(value || '').trim(),
      pages: Math.max(1, Math.ceil(String(value || '').length / 2000)),
      method: 'adobe',
      processingTime: Date.now() - startTime,
      success: !!value,
    };
  } catch (error: any) {
    return {
      text: '',
      pages: 0,
      method: 'adobe',
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message || 'Adobe extraction failed',
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
  const { preferClientSide = true, enableOCR = true } = options;
  
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
    
    // Try Adobe first (highest quality)
    if (enableOCR) {
      const adobeResult = await extractTextWithAdobe(buffer, options);
      if (adobeResult.success && adobeResult.text.length > 100) {
        return adobeResult;
      }
    }

    // Fallback to pdf-parse
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
