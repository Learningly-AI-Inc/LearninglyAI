import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'txt').toLowerCase()
    const path = `${user.id}/${Date.now()}-${file.name}`

    // Upload to a public bucket `user-content` (assumes exists with proper policy)
    const { data: storageData, error: storageError } = await supabase.storage
      .from('user-content')
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type || 'application/octet-stream'
      })

    if (storageError) {
      return NextResponse.json({ error: 'Upload failed', details: storageError.message }, { status: 500 })
    }

    const publicUrl = supabase.storage.from('user-content').getPublicUrl(storageData.path).data.publicUrl

    // Insert into user_content
    const { data: record, error: insertError } = await supabase
      .from('user_content')
      .insert({
        user_id: user.id,
        content_type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt',
        content_url: publicUrl,
        status: 'completed'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Database insert failed', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, content: record })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


