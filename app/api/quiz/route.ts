import { NextResponse } from "next/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { QUIZ_TOOL_SYSTEM } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { topic = "Document concepts", count = 4, difficulty = "easy", context = "", durationMinutes = 30 } = await req.json();

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUIZ_TOOL_SYSTEM },
        { role: "system", content: `Rules for question creation:\n- Questions must test understanding of domain concepts inside the provided context (definitions, relationships, procedures, calculations).\n- Forbidden: questions about the document itself (file types, headings, page counts, authorship, dates of upload, instructions).\n- Answers must be derivable from the context; avoid generic trivia.\n- Prefer focused concept checks over meta or formatting questions.\n- If context is noisy, identify the subject matter and write questions about those concepts, not about the document.` },
        { role: "user", content: `Create ${count} exam questions (duration: ${durationMinutes} minutes, difficulty: ${difficulty}). Topic hint: ${topic}. Use ONLY the source content below; ignore this topic hint if it is generic.

Source content (may be truncated):\n${context.slice(0, 8000)}` }
      ],
      temperature: 0.6,
    });

    const json = completion.choices[0]?.message?.content || "{}";
    return NextResponse.json(JSON.parse(json));
  } catch (error) {
    console.error("Quiz error:", error);
    return NextResponse.json(
      { questions: [] },
      { status: 500 }
    );
  }
}
