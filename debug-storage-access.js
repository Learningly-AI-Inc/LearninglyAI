const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function testStorageAccess() {
  console.log('🔐 Testing Supabase storage access...\n');

  // Test with service role (admin)
  console.log('1. Testing with SERVICE ROLE (admin):');
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: buckets, error } = await adminClient.storage.listBuckets();
    if (error) {
      console.error('   ❌ Service role cannot list buckets:', error.message);
    } else {
      const readingBucket = buckets?.find(b => b.name === 'reading-documents');
      if (readingBucket) {
        console.log('   ✅ Service role can access reading-documents bucket');

        // Try to list files in the bucket
        const { data: files, error: listError } = await adminClient.storage
          .from('reading-documents')
          .list('', { limit: 10 });

        if (listError) {
          console.error('   ❌ Service role cannot list files:', listError.message);
        } else {
          console.log(`   ✅ Service role can list files (${files?.length || 0} files found)`);
        }
      } else {
        console.log('   ❌ reading-documents bucket not found for service role');
      }
    }
  } catch (error) {
    console.error('   💥 Service role test failed:', error.message);
  }

  console.log('\n2. Testing with ANON KEY (user):');
  const userClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: buckets, error } = await userClient.storage.listBuckets();
    if (error) {
      console.error('   ❌ Anon key cannot list buckets:', error.message);
    } else {
      const readingBucket = buckets?.find(b => b.name === 'reading-documents');
      if (readingBucket) {
        console.log('   ✅ Anon key can access reading-documents bucket');

        // Try to list files (this should fail due to RLS)
        const { data: files, error: listError } = await userClient.storage
          .from('reading-documents')
          .list('', { limit: 10 });

        if (listError) {
          console.log('   ⚠️ Anon key cannot list files (expected due to RLS):', listError.message);
        } else {
          console.log(`   ✅ Anon key can list files (${files?.length || 0} files found)`);
        }
      } else {
        console.log('   ❌ reading-documents bucket not found for anon key');
      }
    }
  } catch (error) {
    console.error('   💥 Anon key test failed:', error.message);
  }

  console.log('\n3. Checking bucket policies:');
  try {
    const { data: policies, error } = await adminClient.rpc('get_bucket_policies', {
      bucket_name: 'reading-documents'
    });

    if (error) {
      console.log('   ⚠️ Could not check policies via RPC (normal):', error.message);
    } else {
      console.log('   📋 Bucket policies:', policies);
    }
  } catch (error) {
    console.log('   ⚠️ Policy check failed (normal):', error.message);
  }

  console.log('\n📋 Recommendations:');
  console.log('   1. Make sure you are logged in when uploading files');
  console.log('   2. Check that your user has the correct permissions');
  console.log('   3. Verify that RLS policies are properly configured');
  console.log('   4. Try uploading a file while authenticated');
}

testStorageAccess();


