/**
 * PDF Extractor Utility
 * Client-side PDF text extraction using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface PDFExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  pages: number; // Alias for pageCount
  method: string;
  processingTime: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Validates if a file is a valid PDF
 */
export async function validatePDFFile(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File is not a PDF' };
    }

    // Check file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'PDF file is too large (max 100MB)' };
    }

    if (file.size === 0) {
      return { valid: false, error: 'PDF file is empty' };
    }

    // Try to load the PDF to verify it's valid
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    await loadingTask.promise;

    return { valid: true };
  } catch (error) {
    console.error('PDF validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid PDF file',
    };
  }
}

export interface PDFExtractionOptions {
  preferClientSide?: boolean;
  enableOCR?: boolean;
  timeout?: number;
}

/**
 * Extracts text content from a PDF file or buffer
 */
export async function extractPDFText(
  source: File | Buffer | ArrayBuffer,
  options?: PDFExtractionOptions
): Promise<PDFExtractionResult> {
  const startTime = Date.now();

  try {
    let arrayBuffer: ArrayBuffer;

    // Convert source to array buffer
    if (source instanceof File) {
      arrayBuffer = await source.arrayBuffer();
    } else if (Buffer.isBuffer(source)) {
      // Convert Buffer to ArrayBuffer properly
      const uint8Array = new Uint8Array(source);
      arrayBuffer = uint8Array.buffer;
    } else {
      arrayBuffer = source;
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages;
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // Extract metadata
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any;

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      text: fullText.trim(),
      pageCount,
      pages: pageCount,
      method: 'pdf.js',
      processingTime,
      metadata: {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        keywords: info?.Keywords,
        creator: info?.Creator,
        producer: info?.Producer,
        creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined,
      },
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Extracts text from a specific page of a PDF
 */
export async function extractPDFPageText(
  file: File,
  pageNum: number
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pageNum < 1 || pageNum > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNum}`);
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    return pageText;
  } catch (error) {
    console.error('PDF page extraction error:', error);
    throw new Error(
      `Failed to extract text from page ${pageNum}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}