# Reading Documents Setup Guide

## Overview
This guide walks you through setting up the reading documents feature with Supabase storage integration.

## Prerequisites
- Active Supabase project
- Environment variables configured for Supabase
- Node.js and npm installed

## Step 1: Environment Variables
Ensure these variables are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 2: Database Setup
Run the database setup script to create the required tables and storage bucket:

```bash
node setup_reading_database.js
```

This script will:
- Create the `reading_documents` table
- Create the `reading-documents` storage bucket
- Set up Row Level Security (RLS) policies
- Configure storage policies for secure file access

## Step 3: Manual Setup (Alternative)
If the automated script doesn't work, you can manually run the SQL in your Supabase dashboard:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `reading_documents_schema.sql`
4. Execute the SQL

## Step 4: Storage Bucket Setup
The script creates a storage bucket named `reading-documents` with:
- **Public**: `false` (private bucket for security)
- **File size limit**: `20MB`
- **Allowed MIME types**: `application/pdf`, `text/plain`

## Step 5: Test the Upload
1. Start your development server: `npm run dev`
2. Navigate to the Reading page
3. Click "Upload Documents"
4. Upload a PDF or TXT file
5. Verify the file appears in your Supabase storage bucket

## Features
- ✅ Secure file upload to Supabase storage
- ✅ User-specific file organization
- ✅ Text extraction from PDFs and TXT files
- ✅ Document metadata storage
- ✅ Row Level Security (RLS) for data protection
- ✅ File type and size validation
- ✅ Progress tracking during upload

## File Organization
Files are organized in Supabase storage as:
```
reading-documents/
├── {user_id}/
│   ├── 2024-01-15T10-30-00-000Z-document1.pdf
│   ├── 2024-01-15T10-35-00-000Z-document2.txt
│   └── ...
```

## Database Schema
The `reading_documents` table stores:
- Document metadata (title, filename, size, type)
- Extracted text content
- Processing status and notes
- Public URLs for file access
- User association and timestamps

## Security
- All files are stored in a private bucket
- Users can only access their own files
- RLS policies enforce data isolation
- File type validation prevents malicious uploads

## Troubleshooting
If you encounter issues:

1. **Upload fails**: Check Supabase storage bucket exists and policies are correct
2. **Authentication errors**: Verify user is logged in and has proper permissions
3. **File processing fails**: Check if `pdf-parse` package is installed
4. **Database errors**: Ensure the `reading_documents` table exists and RLS is configured

## Support
For issues or questions, check the console logs for detailed error messages and verify your Supabase configuration.
