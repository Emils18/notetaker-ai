import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Missing GROQ_API_KEY");
}

const groq = new Groq({ apiKey: apiKey || "" });

export async function POST(req: Request) {
  try {
    const { notesText, mode } = await req.json();

    if (!notesText) {
      return NextResponse.json(
        { error: "No notes provided" },
        { status: 400 }
      );
    }

    let systemPrompt = "";

    if (mode === "summary") {  /* Earl Brian Baclohan */
      systemPrompt = `Create an organized executive summary from the notes using Markdown.`;
    } else if (mode === "quiz") { 
      systemPrompt = `Make a five-question multiple-choice test using the notes as a guide.`;
    } else if (mode === "flashcards") {
      systemPrompt = `Create 5 flashcards in Q&A format.`;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a professional tutor. Output ONLY clean Markdown. Never include explanations outside the content.",
        },
        { role: "system", content: systemPrompt },
        { role: "user", content: notesText },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
    });

    return NextResponse.json({
      summary: completion.choices[0]?.message?.content || "",
    });

  } catch (error: any) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}