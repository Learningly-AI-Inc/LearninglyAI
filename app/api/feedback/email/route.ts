import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const name = typeof body.name === 'string' ? body.name.trim() : null
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const source = typeof body.source === 'string' ? body.source : 'landing_contact'
    const user_id = body.user_id && typeof body.user_id === 'string' ? body.user_id : null

    if (!email || !message) {
      return NextResponse.json({ error: 'Missing email or message' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message, source, user_id, metadata: { user_agent: req.headers.get('user-agent') } })
      .select('id')
      .single()

    if (error) {
      console.error('[Supabase] Failed to insert contact message', error)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    console.error('[Contact] Invalid request', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
