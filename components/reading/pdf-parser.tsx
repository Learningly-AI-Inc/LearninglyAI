"use client"

import React, { useEffect, useState } from 'react';

interface PdfParserProps {
  pdfUrl: string;
  onTextExtracted?: (text: string, pageCount: number) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export const PdfParser: React.FC<PdfParserProps> = ({ 
  pdfUrl, 
  onTextExtracted, 
  onError, 
  onProgress 
}) => {
  const [pdfText, setPdfText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const parsePdf = async () => {
    try {
      // Start loading the PDF
      setIsLoading(true);
      setLoadingProgress(0);
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
      setPageCount(numPages);
      let textContent = '';

      console.log(`📄 PDF loaded successfully. Pages: ${numPages}`);

      // Loop through all pages and extract text
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        // Report progress
        const progress = ((pageNumber / numPages) * 100);
        setLoadingProgress(progress);
        onProgress?.(progress);

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

      // Update state with the extracted text
      setPdfText(cleanedText);

      // Notify parent component
      onTextExtracted?.(cleanedText, numPages);

      // Clear loading state after parsing
      setIsLoading(false);
    } catch (err: any) {
      // Handle different types of errors
      setIsLoading(false);
      const errorMessage = `Error parsing PDF: ${err.message}`;
      setError(errorMessage);
      onError?.(errorMessage);

      // Log the error details to the terminal for debugging
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
    }
  };

  useEffect(() => {
    if (pdfUrl) {
      parsePdf();
    }
  }, [pdfUrl]);

  // Return null since this is a utility component
  return null;
};

export default PdfParser;
