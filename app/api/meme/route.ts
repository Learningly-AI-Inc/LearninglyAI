import { NextResponse } from "next/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { MEME_TOOL_SYSTEM } from "@/lib/prompts";

function fallbackMeme(topic: string) {
  const t = (topic || 'Studying').trim();
  const examples: Record<string, { topText: string; bottomText: string }[]> = {
    recursion: [
      { topText: "Recursion?", bottomText: "See: Recursion (base case first)" },
      { topText: "When you call yourself", bottomText: "But you remembered the base case" },
    ],
    pointers: [
      { topText: "When pointers finally click", bottomText: "& gets address, * dereferences" },
      { topText: "Segfault Friday", bottomText: "Because you forgot to initialize the pointer" },
    ],
    default: [
      { topText: `${t} in one meme`, bottomText: "Short mnemonic > long paragraph" },
      { topText: `Studying ${t}`, bottomText: "Key idea > examples > repeat" },
    ],
  };
  const key = Object.keys(examples).find(k => t.toLowerCase().includes(k)) || 'default';
  const list = examples[key];
  const pick = list[Math.floor(Math.random() * list.length)];
  return pick;
}

export async function POST(req: Request) {
  // Parse body safely first
  const { topic: rawTopic } = await req.json().catch(() => ({ topic: "Studying" }));
  const topic = (rawTopic || "Studying") as string;

  // If no API key, return a deterministic fallback meme with 200
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    const meme = fallbackMeme(topic);
    return NextResponse.json({ ...meme, metadata: { model: "fallback" } });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MEME_TOOL_SYSTEM },
        { role: "user", content: `topic: ${topic}` }
      ],
      temperature: 0.9,
    });

    const json = completion.choices[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(json); } catch { parsed = {}; }
    if (!parsed.topText || !parsed.bottomText) {
      parsed = fallbackMeme(topic);
    }
    return NextResponse.json({ ...parsed, metadata: { model: DEFAULT_MODEL } });
  } catch (error) {
    console.error("Meme error:", error);
    const meme = fallbackMeme(topic);
    // Return fallback with 200 to keep UI happy
    return NextResponse.json({ ...meme, metadata: { model: "fallback" } });
  }
}
