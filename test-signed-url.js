const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function testSignedUrl() {
  console.log('🔐 Testing signed URL generation...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // First, let's see if we can list files in the bucket (should fail for anon)
    console.log('1. Testing file listing:');
    const { data: files, error: listError } = await supabase.storage
      .from('reading-documents')
      .list('', { limit: 5 });

    if (listError) {
      console.log('   ⚠️ Cannot list files (expected for private bucket):', listError.message);
    } else {
      console.log('   ✅ Found files:', files?.length || 0);
      if (files && files.length > 0) {
        const firstFile = files[0];
        console.log('   📄 First file:', firstFile.name);

        // Try to generate a signed URL for this file
        console.log('\n2. Generating signed URL:');
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from('reading-documents')
          .createSignedUrl(firstFile.name, 3600); // 1 hour

        if (signedError) {
          console.log('   ❌ Failed to generate signed URL:', signedError.message);
        } else if (signedUrlData?.signedUrl) {
          console.log('   ✅ Signed URL generated successfully!');
          console.log('   🔗 URL:', signedUrlData.signedUrl.substring(0, 100) + '...');

          // Test if the signed URL is accessible
          console.log('\n3. Testing signed URL accessibility:');
          try {
            const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
            console.log('   📡 HTTP Status:', response.status);
            if (response.ok) {
              console.log('   ✅ Signed URL is accessible!');
              const contentType = response.headers.get('content-type');
              console.log('   📄 Content-Type:', contentType);
            } else {
              console.log('   ❌ Signed URL returned error:', response.statusText);
            }
          } catch (fetchError) {
            console.log('   ❌ Failed to access signed URL:', fetchError.message);
          }
        }
      } else {
        console.log('   📭 No files found in bucket');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   - Private buckets require signed URLs for browser access');
  console.log('   - Signed URLs expire after the specified time (1 hour)');
  console.log('   - This should fix the 404 bucket not found error');
}

testSignedUrl();




