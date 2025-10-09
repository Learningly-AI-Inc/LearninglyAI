# How to Increase Supabase Storage Bucket Size Limit

## Problem
Your application is currently configured to allow uploads up to 50MB, but you're hitting the Supabase Storage bucket limit which is also set to 50MB. If you need to upload larger files, you'll need to increase the bucket size limit.

## Error You're Seeing
```
StorageApiError: The object exceeded the maximum allowed size
Status: 413 (Payload Too Large)
```

## Solution: Increase Bucket Size Limit in Supabase

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Access Storage Settings**
   - Click on **Storage** in the left sidebar
   - Find and click on the **exam-files** bucket

3. **Update Bucket Settings**
   - Click on the **Settings** or **Configuration** tab
   - Look for **File size limit** setting
   - Change from `50MB` to your desired limit (e.g., `100MB`)
   - Click **Save** or **Update**

4. **Update Your Code**
   After increasing the bucket limit, update these files:

   **components/exam-prep/study-materials-uploader.tsx:**
   ```typescript
   // Change from:
   const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

   // To:
   const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
   ```

   **app/api/exam-prep/upload/route.ts:**
   ```typescript
   // Change from:
   const maxSize = 50 * 1024 * 1024; // 50MB

   // To:
   const maxSize = 100 * 1024 * 1024; // 100MB
   ```

   **Update UI text in study-materials-uploader.tsx:**
   ```tsx
   // Change from:
   <p className="text-gray-500 text-sm mb-4">
     Supports PDF, TXT, DOCX • Max 50MB per file
   </p>

   // To:
   <p className="text-gray-500 text-sm mb-4">
     Supports PDF, TXT, DOCX • Max 100MB per file
   </p>
   ```

### Option 2: Via Supabase SQL (Advanced)

If you can't access the dashboard, you can update via SQL:

```sql
-- Update bucket configuration
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes (100 * 1024 * 1024)
WHERE id = 'exam-files';
```

### Option 3: Via Supabase Management API (Programmatic)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key required
)

// Update bucket settings
const { data, error } = await supabase
  .storage
  .updateBucket('exam-files', {
    public: false,
    fileSizeLimit: 104857600, // 100MB in bytes
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  })

if (error) {
  console.error('Error updating bucket:', error)
} else {
  console.log('Bucket updated successfully:', data)
}
```

## Common File Size Limits

| Size | Bytes | Use Case |
|------|-------|----------|
| 10MB | 10485760 | Small documents, basic PDFs |
| 25MB | 26214400 | Medium documents |
| 50MB | 52428800 | Standard documents (current) |
| 100MB | 104857600 | Large documents, scanned PDFs |
| 250MB | 262144000 | Very large documents, presentations |
| 500MB | 524288000 | Maximum recommended |

## Important Notes

1. **Storage Costs**: Larger files consume more storage space. Check your Supabase pricing plan to ensure you have enough storage quota.

2. **Network Transfer**: Larger files take longer to upload and may cause issues for users with slow connections.

3. **Processing Time**: Larger PDFs take significantly longer to extract text from. Consider:
   - Adding upload progress indicators
   - Implementing background processing
   - Setting reasonable timeouts

4. **Free Tier Limits**: Supabase free tier includes:
   - 1GB storage
   - 2GB transfer per month
   - Be mindful of these limits when allowing large uploads

5. **Best Practices**:
   - Keep limits reasonable (50-100MB is usually sufficient)
   - Validate file sizes on both frontend and backend
   - Compress PDFs before upload when possible
   - Consider splitting very large documents

## Verify Your Changes

After updating, test with a file larger than the old limit:

1. Try uploading a 60MB file (if you increased to 100MB)
2. Check the browser console for any errors
3. Verify the file appears in Supabase Storage
4. Confirm text extraction works properly

## Troubleshooting

### Still Getting 413 Error?
- Clear browser cache
- Restart your Next.js dev server
- Double-check the bucket name is correct (`exam-files`)
- Verify you updated ALL size limits in the code

### Upload Timing Out?
- Increase API route timeout in next.config.js:
  ```javascript
  module.exports = {
    api: {
      bodyParser: {
        sizeLimit: '100mb',
      },
      responseLimit: false,
    },
  }
  ```

### Text Extraction Failing?
- Large PDFs may timeout during extraction
- Consider implementing background job processing
- Use webhook-based extraction for files >50MB

## Contact Support

If you continue having issues:
- Check Supabase status: https://status.supabase.com
- Supabase Discord: https://discord.supabase.com
- Supabase Support: support@supabase.com
