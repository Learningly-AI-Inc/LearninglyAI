#!/usr/bin/env node

/**
 * Script to check and optionally update Supabase Storage bucket limits
 * Usage: node scripts/check-bucket-limits.js [--update]
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBuckets() {
  console.log('🔍 Checking Supabase Storage buckets...\n')

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Error fetching buckets:', error.message)
      process.exit(1)
    }

    console.log('📦 Found buckets:\n')
    buckets.forEach(bucket => {
      const sizeMB = bucket.file_size_limit ?
        (bucket.file_size_limit / 1024 / 1024).toFixed(0) :
        'No limit'

      console.log(`  • ${bucket.name}`)
      console.log(`    - Public: ${bucket.public}`)
      console.log(`    - Size Limit: ${sizeMB}MB`)
      console.log(`    - Created: ${new Date(bucket.created_at).toLocaleDateString()}`)
      console.log('')
    })

    // Check specific buckets we care about
    const examBucket = buckets.find(b => b.id === 'exam-files')
    const readingBucket = buckets.find(b => b.id === 'reading-documents')

    if (examBucket) {
      const sizeMB = examBucket.file_size_limit / 1024 / 1024
      if (sizeMB < 100) {
        console.log(`⚠️  WARNING: exam-files bucket limit is ${sizeMB}MB`)
        console.log(`   This is less than the recommended 100MB`)
        console.log(`   Run with --update flag to increase it\n`)
      } else {
        console.log(`✅ exam-files bucket limit is ${sizeMB}MB (OK)\n`)
      }
    }

    return buckets
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

async function updateBucketLimit(bucketId, newLimitMB) {
  console.log(`📝 Updating ${bucketId} size limit to ${newLimitMB}MB...`)

  try {
    const { data, error } = await supabase
      .storage
      .updateBucket(bucketId, {
        fileSizeLimit: newLimitMB * 1024 * 1024
      })

    if (error) {
      console.error(`❌ Error updating bucket:`, error.message)
      return false
    }

    console.log(`✅ Successfully updated ${bucketId} to ${newLimitMB}MB`)
    return true
  } catch (err) {
    console.error(`❌ Unexpected error:`, err.message)
    return false
  }
}

async function main() {
  const shouldUpdate = process.argv.includes('--update')

  await checkBuckets()

  if (shouldUpdate) {
    console.log('\n📝 Updating bucket limits...\n')

    // Update exam-files bucket to 100MB
    await updateBucketLimit('exam-files', 100)

    // Update reading-documents bucket if it exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (buckets?.some(b => b.id === 'reading-documents')) {
      await updateBucketLimit('reading-documents', 100)
    }

    console.log('\n✅ Bucket limits updated!')
    console.log('\n⚠️  IMPORTANT: Update your code limits:')
    console.log('   1. components/exam-prep/study-materials-uploader.tsx (line 32)')
    console.log('   2. app/api/exam-prep/upload/route.ts (line 37)')
    console.log('   Change: const MAX_FILE_SIZE = 100 * 1024 * 1024')
    console.log('')
  } else {
    console.log('💡 Tip: Run with --update flag to automatically increase bucket limits')
  }
}

main().catch(console.error)
