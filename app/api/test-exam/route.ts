import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Test exam API called with:', body);
    
    const { mode, topic } = body;
    
    if (mode === 'quiz') {
      return NextResponse.json({
        questions: [
          {
            id: 'test1',
            type: 'fill',
            prompt: `What is a key concept in ${topic}?`,
            answer: 'programming'
          },
          {
            id: 'test2',
            type: 'single',
            prompt: `Which is a programming language?`,
            choices: ['JavaScript', 'HTML', 'CSS', 'JSON'],
            answer: 'JavaScript'
          }
        ]
      });
    }
    
    if (mode === 'flashcards') {
      return NextResponse.json({
        cards: [
          {
            id: 'card1',
            front: `${topic} - Variables`,
            back: 'Storage containers for data values'
          },
          {
            id: 'card2',
            front: `${topic} - Functions`,
            back: 'Reusable blocks of code'
          }
        ]
      });
    }
    
    if (mode === 'meme') {
      return NextResponse.json({
        topText: `When ${topic} finally clicks`,
        bottomText: 'Time to debug everything else!'
      });
    }
    
    return NextResponse.json({ error: 'Unknown mode' });
  } catch (error) {
    console.error('Test exam API error:', error);
    return NextResponse.json(
      { error: 'API error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test exam API is working',
    timestamp: new Date().toISOString()
  });
}

