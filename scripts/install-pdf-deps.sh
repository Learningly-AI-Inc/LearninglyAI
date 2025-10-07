#!/bin/bash

# Installation script for PDF processing dependencies
# This script installs the required packages for optimal PDF text extraction

echo "Installing PDF processing dependencies..."

# Install core dependencies
echo "Installing core dependencies..."
npm install pdf-parse pdfjs-dist mammoth

# Install Adobe PDF Services SDK (optional, for highest quality extraction)
echo "Installing Adobe PDF Services SDK (optional)..."
npm install @adobe/pdfservices-node-sdk

# Install TypeScript types
echo "Installing TypeScript types..."
npm install --save-dev @types/node @types/pdf-parse

echo "Installation complete!"
echo ""
echo "Note: Adobe PDF Services SDK requires API credentials."
echo "Set these environment variables for Adobe services:"
echo "  PDF_SERVICES_CLIENT_ID=your_client_id"
echo "  PDF_SERVICES_CLIENT_SECRET=your_client_secret"
echo ""
echo "Or use the ADOBE_ prefix:"
echo "  ADOBE_CLIENT_ID=your_client_id"
echo "  ADOBE_CLIENT_SECRET=your_client_secret"
