import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const incoming = await request.formData()
    const file = incoming.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Forward to the robust reading upload pipeline (extracts text and saves to reading_documents)
    const fd = new FormData()
    fd.append('file', file)

    const forwardRes = await fetch(`${request.nextUrl.origin}/api/reading/upload`, {
      method: 'POST',
      body: fd,
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    if (!forwardRes.ok) {
      const err = await forwardRes.json().catch(() => ({}))
      return NextResponse.json({ error: 'Upstream upload failed', details: err.error || forwardRes.statusText }, { status: 500 })
    }

    const readingData = await forwardRes.json()

    // Also register a lightweight entry in user_content so the search UI can list uploads
    const ext = (file.name.split('.').pop() || 'txt').toLowerCase()
    const { data: record } = await supabase
      .from('user_content')
      .insert({
        user_id: user.id,
        content_type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? 'image' : 'txt',
        content_url: readingData?.fileUrl || '',
        status: 'completed'
      })
      .select()
      .single()

    return NextResponse.json({ success: true, ...readingData, content: record })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


