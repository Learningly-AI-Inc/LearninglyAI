/**
 * Utility functions to handle Google Docs integration
 */

// Function to open content in Google Docs
export const openInGoogleDocs = (htmlContent: string) => {
  // Strip HTML tags for plain text
  const plainText = htmlContent.replace(/<[^>]*>?/gm, '');
  
  // URL encode the text
  const encodedText = encodeURIComponent(plainText);
  
  // Create a Google Docs URL with the content
  const googleDocsUrl = `https://docs.google.com/document/create?title=Learningly%20Document&body=${encodedText}`;
  
  // Open in a new tab
  window.open(googleDocsUrl, '_blank');
};

// Function to open file download dialog
export const downloadFile = (content: string, fileName: string, fileType: string) => {
  // Create a blob with the content
  const blob = new Blob([content], { type: fileType });
  
  // Create a download link
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = fileName;
  
  // Add to document, trigger click, and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Clean up the URL object
  URL.revokeObjectURL(downloadLink.href);
};
