import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Test 1: Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        details: userError?.message
      });
    }

    // Test 2: Check if bucket exists
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.id === 'exam-files');

    // Test 3: Try to list files in bucket (should work even if empty)
    let bucketAccessible = false;
    let bucketAccessError = null;
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('exam-files')
        .list(user.id, { limit: 1 });
      
      bucketAccessible = !listError;
      bucketAccessError = listError;
    } catch (err) {
      bucketAccessError = err;
    }

    // Test 4: Check if database tables exist
    let tablesExist = false;
    let tableError = null;
    try {
      const { data, error } = await supabase
        .from('exam_files')
        .select('id')
        .limit(1);
      
      tablesExist = !error;
      tableError = error;
    } catch (err) {
      tableError = err;
    }

    return NextResponse.json({
      success: true,
      tests: {
        authentication: {
          success: true,
          userId: user.id,
          email: user.email
        },
        bucket: {
          exists: bucketExists,
          accessible: bucketAccessible,
          error: bucketAccessError instanceof Error ? bucketAccessError.message : null,
          buckets: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })) || []
        },
        database: {
          tablesExist: tablesExist,
          error: tableError instanceof Error ? tableError.message : null
        }
      },
      recommendations: [
        !bucketExists && 'Create the "exam-files" bucket in Supabase dashboard',
        !bucketAccessible && 'Check bucket permissions and RLS policies',
        !tablesExist && 'Run the database schema setup script'
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
