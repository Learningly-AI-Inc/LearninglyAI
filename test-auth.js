const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function testAuth() {
  console.log('🔐 Testing authentication...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test basic connection
  console.log('1. Testing basic connection:');
  try {
    const { data, error } = await supabase.from('reading_documents').select('count').limit(1);
    if (error) {
      console.log('   ⚠️ Cannot query reading_documents table (expected for anon):', error.message);
    } else {
      console.log('   ✅ Can query reading_documents table');
    }
  } catch (error) {
    console.log('   ⚠️ Query failed:', error.message);
  }

  // Test auth state
  console.log('\n2. Testing auth state:');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('   ⚠️ Auth check error:', error.message);
    } else if (user) {
      console.log('   ✅ User is authenticated:', user.id);
    } else {
      console.log('   ⚠️ No authenticated user (expected for anon key)');
    }
  } catch (error) {
    console.log('   💥 Auth check failed:', error.message);
  }

  // Test storage access
  console.log('\n3. Testing storage access:');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('   ❌ Cannot list buckets:', error.message);
    } else {
      const readingBucket = buckets?.find(b => b.name === 'reading-documents');
      if (readingBucket) {
        console.log('   ✅ Can see reading-documents bucket');

        // Try to list files (should fail for anon)
        const { data: files, error: listError } = await supabase.storage
          .from('reading-documents')
          .list('', { limit: 1 });

        if (listError) {
          console.log('   ⚠️ Cannot list files (expected for anon):', listError.message);
        } else {
          console.log('   ✅ Can list files (unexpected for anon)');
        }
      } else {
        console.log('   ❌ reading-documents bucket not visible');
      }
    }
  } catch (error) {
    console.log('   💥 Storage test failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   - If you see "No authenticated user", you need to log in to the app first');
  console.log('   - The anon key cannot access private buckets without authentication');
  console.log('   - Make sure you are logged in when trying to upload/process documents');
}

testAuth();





