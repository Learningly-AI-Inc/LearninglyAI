# PDF Processing Dependencies Installation Guide

## Quick Fix for Missing Dependencies

The PDF text extraction functionality requires some additional packages. Here's how to install them:

### Option 1: Install Core Dependencies Only (Recommended)

```bash
# Install the essential packages for PDF processing
npm install pdf-parse pdfjs-dist mammoth

# Install TypeScript types
npm install --save-dev @types/node @types/pdf-parse
```

### Option 2: Use the Installation Script

```bash
# Run the provided installation script
./scripts/install-pdf-deps.sh
```

### Option 3: Install Everything Including Adobe SDK (Optional)

```bash
# Install all dependencies including Adobe PDF Services SDK
npm install pdf-parse pdfjs-dist mammoth @adobe/pdfservices-node-sdk
npm install --save-dev @types/node @types/pdf-parse
```

## What Each Package Does

- **pdf-parse**: Server-side PDF text extraction
- **pdfjs-dist**: Client-side PDF processing and text extraction
- **mammoth**: DOCX file text extraction (used with Adobe SDK)
- **@adobe/pdfservices-node-sdk**: High-quality PDF processing with OCR (optional)

## Adobe PDF Services SDK (Optional)

The Adobe SDK provides the highest quality PDF text extraction, especially for:
- Image-based PDFs
- Scanned documents
- Complex layouts

To use it, you need:
1. Adobe PDF Services API credentials
2. Set environment variables:

```env
PDF_SERVICES_CLIENT_ID=your_client_id
PDF_SERVICES_CLIENT_SECRET=your_client_secret
```

## Current Status

The application now uses a **lite version** of the PDF extractor that works without the Adobe SDK. This provides:

- ✅ Client-side PDF text extraction (fastest)
- ✅ Server-side pdf-parse extraction (reliable)
- ✅ Fallback handling for image-based PDFs
- ✅ No external API dependencies

## Testing the Fix

After installation, test the PDF upload functionality:

1. Go to the Reading module
2. Upload a PDF file
3. Check that text extraction works
4. Verify that AI summaries and notes can be generated

## Troubleshooting

### Network Issues
If you encounter network errors during installation:

```bash
# Try with different registry
npm install --registry https://registry.npmjs.org/

# Or use yarn instead
yarn add pdf-parse pdfjs-dist mammoth
```

### TypeScript Errors
If you see TypeScript errors:

```bash
# Install types
npm install --save-dev @types/node @types/pdf-parse

# Or add to tsconfig.json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

### Adobe SDK Issues
If Adobe SDK installation fails, the application will work fine without it. The lite version provides good PDF text extraction for most use cases.

## Performance Notes

- **Client-side extraction**: Fastest, works in browser
- **Server-side extraction**: More reliable, works on server
- **Adobe SDK**: Highest quality but requires API credentials

The system automatically chooses the best available method for each PDF.
