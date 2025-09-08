const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n📋 Please check your .env.local file and ensure these variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
  console.log('🔍 Checking Supabase storage buckets...\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Failed to list buckets:', error.message);
      return;
    }

    if (!buckets || buckets.length === 0) {
      console.log('📭 No storage buckets found in your Supabase project.');
      console.log('\n📋 You need to create the "reading-documents" bucket.');
      return;
    }

    console.log('📂 Existing storage buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
    });

    const readingBucket = buckets.find(bucket => bucket.name === 'reading-documents');

    if (readingBucket) {
      console.log('\n✅ "reading-documents" bucket exists!');
      console.log(`   - Public: ${readingBucket.public}`);
      console.log(`   - Created: ${readingBucket.created_at}`);
    } else {
      console.log('\n❌ "reading-documents" bucket is missing!');
      console.log('\n📋 You need to create this bucket. Here are your options:');
      console.log('\n1. Run the automated setup:');
      console.log('   node setup_reading_database.js');
      console.log('\n2. Create manually in Supabase Dashboard:');
      console.log('   - Go to Storage in your Supabase dashboard');
      console.log('   - Click "Create Bucket"');
      console.log('   - Name: reading-documents');
      console.log('   - Public: Unchecked (Private)');
      console.log('   - File size limit: 20MB');
      console.log('   - Allowed MIME types: application/pdf, text/plain');
    }

  } catch (error) {
    console.error('💥 Error checking buckets:', error.message);
  }
}

checkBuckets();




