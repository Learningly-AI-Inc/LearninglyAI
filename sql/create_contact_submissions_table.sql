-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on submitted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at
ON contact_submissions(submitted_at DESC);

-- Add index on read status
CREATE INDEX IF NOT EXISTS idx_contact_submissions_read
ON contact_submissions(read);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Only admins can read contact submissions
CREATE POLICY "Admins can view contact submissions"
ON contact_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_data
    WHERE user_data.user_id = auth.uid()
    AND user_data.role = 'admin'
  )
);

-- Anyone can insert (for the contact form)
CREATE POLICY "Anyone can submit contact form"
ON contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Comment
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the landing page';
