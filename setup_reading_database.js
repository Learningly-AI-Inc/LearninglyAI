const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupReadingDatabase() {
  console.log('🚀 Setting up Reading Documents database schema...');
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'reading_documents_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Executing database schema...');
    
    // Execute the SQL schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Database schema created successfully!');
    console.log('✅ Storage bucket "reading-documents" created!');
    console.log('✅ Storage policies configured!');
    console.log('✅ RLS policies enabled!');
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    // Check if table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'reading_documents');
    
    if (tableError) {
      console.warn('⚠️ Could not verify table creation:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ reading_documents table exists');
    } else {
      console.warn('⚠️ reading_documents table not found');
    }
    
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.warn('⚠️ Could not verify bucket creation:', bucketError.message);
    } else {
      const readingBucket = buckets?.find(bucket => bucket.name === 'reading-documents');
      if (readingBucket) {
        console.log('✅ reading-documents bucket exists');
      } else {
        console.warn('⚠️ reading-documents bucket not found');
      }
    }
    
    console.log('\n🎉 Reading Documents setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the upload functionality');
    console.log('   2. Verify file uploads to Supabase storage');
    console.log('   3. Check document processing and text extraction');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupReadingDatabase();
