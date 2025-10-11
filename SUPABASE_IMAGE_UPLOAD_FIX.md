# Fix Image Upload in Search Page

## Problem
The `reading-documents` storage bucket in Supabase has MIME type restrictions that prevent image uploads (PNG, JPEG, JPG, etc.).

Error: `"mime type image/png is not supported"`

## Solution

### Option 1: Update Supabase Bucket Configuration (Recommended)

Go to your Supabase Dashboard:

1. Navigate to **Storage** → **reading-documents** bucket
2. Click on **Configuration** or **Settings**
3. Update the **Allowed MIME types** to include:
   ```
   image/png
   image/jpeg
   image/jpg
   image/gif
   image/webp
   ```
4. Or set it to allow all types by using `*/*`

### Option 2: SQL Commands (If you have database access)

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Update the reading-documents bucket to allow image uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp'
]
WHERE id = 'reading-documents';
```

Or to allow all file types:

```sql
UPDATE storage.buckets
SET allowed_mime_types = NULL  -- NULL means allow all types
WHERE id = 'reading-documents';
```

**Note**: The code has been updated to use `document_type: 'reading'` for images to comply with the existing database constraint. Images are identified by their `mime_type` and `isImage` flag in metadata.

### Option 3: Create a Separate Images Bucket

If you prefer to keep images separate:

1. Create a new bucket called `images` or `search-images`
2. Set allowed MIME types to image types only
3. Update the code to use this bucket for images

## Code Changes Made

The API has been updated to:
- ✅ Recognize image file types (PNG, JPEG, JPG, GIF, WEBP)
- ✅ Handle image uploads with proper metadata
- ✅ Provide helpful error messages when bucket restrictions block uploads
- ✅ Store images in the database with `document_type: 'image'`

## Testing

After applying the Supabase bucket fix, test by:
1. Go to `/search` page
2. Upload a PNG or JPEG image
3. Should upload successfully and be available for chat context
