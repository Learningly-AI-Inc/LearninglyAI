"use client"

import { useState, useCallback } from 'react';

interface UsePdfParserReturn {
  parsePdf: (pdfUrl: string) => Promise<{
    text: string;
    pageCount: number;
  }>;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export function usePdfParser(): UsePdfParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const parsePdf = useCallback(async (pdfUrl: string): Promise<{
    text: string;
    pageCount: number;
  }> => {
    try {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      console.log('🔍 Starting PDF parsing for URL:', pdfUrl);

      // Dynamically import PDF.js to avoid webpack issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set the workerSrc path for PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

      // Fetch PDF document
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

      if (!pdf) {
        throw new Error('Failed to load PDF');
      }

      const numPages = pdf.numPages;
      let textContent = '';

      console.log(`📄 PDF loaded successfully. Pages: ${numPages}`);

      // Loop through all pages and extract text
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        // Report progress
        const progressValue = ((pageNumber / numPages) * 100);
        setProgress(progressValue);

        console.log(`📖 Processing page ${pageNumber}/${numPages}`);

        // Get the text content from the page
        const content = await page.getTextContent();

        if (content.items.length === 0) {
          console.warn(`⚠️ Page ${pageNumber} contains no text!`);
        }

        // Extract the text from the page
        const textItems = content.items.map((item) => 'str' in item ? item.str : '');
        const pageText = textItems.join(' ');
        textContent += pageText + '\n\n';

        console.log(`✅ Page ${pageNumber} processed. Text length: ${pageText.length}`);
      }

      // Clean up the text (remove excessive whitespace)
      const cleanedText = textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      console.log(`🎉 PDF parsing completed. Total text length: ${cleanedText.length}`);

      setIsLoading(false);
      return { text: cleanedText, pageCount: numPages };

    } catch (err: any) {
      setIsLoading(false);
      const errorMessage = `Error parsing PDF: ${err.message}`;
      setError(errorMessage);

      console.error('❌ PDF parsing error:', err);

      // Handling more specific errors
      if (err.name === 'NetworkError') {
        console.error('🌐 Network issue: Failed to fetch PDF file.');
      } else if (err.message.includes('Invalid PDF')) {
        console.error('📄 The provided file is not a valid PDF.');
      } else if (err.message.includes('Page')) {
        console.error('📖 There was an issue with a specific page in the PDF.');
      } else {
        console.error('❓ Unknown error occurred while processing the PDF.');
      }

      throw new Error(errorMessage);
    }
  }, []);

  return {
    parsePdf,
    isLoading,
    progress,
    error
  };
}
