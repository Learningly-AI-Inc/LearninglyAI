# 🗂️ Create Supabase Storage Bucket for Exam Prep

## **Quick Setup Instructions**

### **Step 1: Go to Supabase Dashboard**
1. Open your browser and go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### **Step 2: Navigate to Storage**
1. In the left sidebar, click **"Storage"**
2. You should see a list of existing buckets (if any)

### **Step 3: Create New Bucket**
1. Click the **"Create Bucket"** button (usually at the top right)
2. Fill in the bucket details:

```
Bucket name: exam-files
☑️ Public bucket (IMPORTANT: Check this box)
File size limit: 10 MB
Allowed MIME types: application/pdf
```

### **Step 4: Create the Bucket**
1. Click **"Create bucket"**
2. You should see "exam-files" appear in your buckets list

### **Step 5: Verify Setup**
1. The bucket should show as "Public" in the list
2. You can click on it to see it's empty (which is normal)

## **Alternative: SQL Method**

If you prefer using SQL, go to **SQL Editor** in Supabase and run:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam-files', 'exam-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload exam files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their exam files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their exam files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'exam-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## **Troubleshooting**

### **If you get "Bucket already exists" error:**
- The bucket is already created, you can proceed

### **If you can't see the Storage section:**
- Make sure you're logged in as the project owner
- Check that you have the correct project selected

### **If the bucket creation fails:**
- Try the SQL method above
- Make sure you have admin privileges on the project

## **After Creating the Bucket**

Once the bucket is created:
1. Go back to your exam prep page
2. Try uploading a PDF file
3. The upload should work without errors
4. You can proceed with exam generation

## **What This Enables**

With the `exam-files` bucket created, users can:
- ✅ Upload PDF study materials
- ✅ Generate AI-powered exams from their content
- ✅ Take comprehensive practice tests
- ✅ Track their performance over time

---

**Need help?** The bucket creation is a one-time setup. Once it's done, all exam prep features will work automatically!
