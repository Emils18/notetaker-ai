import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Missing GROQ_API_KEY");
}

const groq = new Groq({ apiKey: apiKey || "" });

export async function POST(req: Request) {
  try {
    const { notesText, mode, quizType } = await req.json();

    if (!notesText) {
      return NextResponse.json(
        { error: "No notes provided" },
        { status: 400 }
      );
    }

    let systemPrompt = "";

    // 🔥 SUMMARY MODE
    if (mode === "summary") {
      systemPrompt = `
      Act as a professional academic editor. Summarize the notes into an EXECUTIVE SUMMARY.
      - Use "## [Section Title]" for headers.
      - Use "**term**" for bold emphasis.
      - Use ">" for key takeaways.
      `;
    }

    // 🔥 QUIZ MODE (ADVANCED TYPES)
    else if (mode === "quiz") {
      if (quizType === "mcq") {
        systemPrompt = `
        Create 5 Multiple Choice Questions.
        FORMAT: 
        Q: [Question] | A) [Option] | B) [Option] | C) [Option] | D) [Option] | Correct: [Letter]
        `;
      } else if (quizType === "id") {
        systemPrompt = `
        Create 5 Identification Questions.
        FORMAT: 
        Q: [Question] | A: [Answer]
        `;
      } else if (quizType === "tf") {
        systemPrompt = `
        Create 5 True or False Statements.
        FORMAT: 
        Q: [Statement] | A: [True/False] | E: [Explanation]
        `;
      } else {
        systemPrompt = `Create a 5-question quiz based on the notes.`;
      }
    }

    // 🔥 FLASHCARDS (from your version)
    else if (mode === "flashcards") {
      systemPrompt = `
      Create 5 flashcards in Q&A format.
      FORMAT:
      Q: [Question]
      A: [Answer]
      `;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Output ONLY clean structured data. No intro text. No explanations outside the content.",
        },
        { role: "system", content: systemPrompt },
        { role: "user", content: notesText },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
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