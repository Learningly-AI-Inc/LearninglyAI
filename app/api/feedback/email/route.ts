import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const to = (body.to as string) || 'contact@learningly.ai'
    const subject = 'Learningly Feedback'
    const text = JSON.stringify(body, null, 2)

    // Simple email relay using mailto fallback for now; swap with real provider if needed
    console.log('Feedback received, emailing to:', to, text)

    // In production, integrate a mail provider or SMTP here
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}


