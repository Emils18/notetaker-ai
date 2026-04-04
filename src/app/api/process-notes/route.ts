import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: apiKey || "" });

export async function POST(req: Request) {
  try {
    const { notesText, mode, quizType } = await req.json();

    if (!notesText) {
      return NextResponse.json({ error: "No notes provided" }, { status: 400 });
    }

    let systemPrompt = "";

    // 🏆 PREMIUM SUMMARY
    if (mode === "summary") {
      systemPrompt = `
      Act as a World-Class Academic Researcher.
      1. DECODE: First, clean the messy OCR text. Fix typos and logic.
      2. CONVERT: Create a high-end study report.
      - Use "# [Title]" for the main topic.
      - Use "## THE BIG PICTURE" for a 2-sentence overview.
      - Use "## KEY CONCEPTS" with bullet points and bold terms.
      - Use "> [Key Quote]" for the most important sentence.
      - Use "---" dividers between sections.
      `;
    }

    // 📝 INTERACTIVE QUIZ ENGINE
    else if (mode === "quiz") {
      if (quizType === "mcq") {
        systemPrompt = `
        Create 5 Multiple Choice Questions.
        STRICT FORMAT: 
        Q: [Question Text] | A) [Option] | B) [Option] | C) [Option] | D) [Option] | Correct: [Letter]
        (Every question MUST be on one single line).
        `;
      } else if (quizType === "id") {
        systemPrompt = `
        Create 5 Identification Questions.
        STRICT FORMAT: 
        Q: [Question Text] | Answer: [Short Correct Answer]
        (Every question MUST be on one single line).
        `;
      } else if (quizType === "tf") {
        systemPrompt = `
        Create 5 True or False Statements.
        STRICT FORMAT: 
        S: [Statement Text] | Answer: [True or False] | E: [One sentence explanation why]
        (Every statement MUST be on one single line).
        `;
      }
    }

    // 🎴 3D FLASHCARD DECK
    else if (mode === "flashcards") {
      systemPrompt = `
      Create 8 high-impact flashcards.
      STRICT FORMAT:
      Front: [Concept Name - Max 5 words] | Back: [Clear Definition - Max 2 sentences]
      (Every card MUST be on one single line).
      `;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON Data Architect. Output ONLY the requested content. No introduction, no 'Sure!', no pleasantries. Start immediately with the first line of data.",
        },
        { role: "system", content: systemPrompt },
        { role: "user", content: `Raw Notes: ${notesText}` },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2, // Kept very low for perfect formatting
    });

    return NextResponse.json({
      summary: completion.choices[0]?.message?.content || "",
    });

  } catch (error: any) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}