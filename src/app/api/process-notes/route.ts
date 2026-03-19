import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        const { notesText, mode } = await req.json();

        if (!notesText) {
            return NextResponse.json({ error: "No notes provided" }, { status: 400 });
        }

        // --- ENHANCED DESIGN INSTRUCTIONS ---
        let systemPrompt = "";
        
        if (mode === 'summary') {
            systemPrompt = `
            Act as a professional editor. Summarize the notes into a high-level EXECUTIVE SUMMARY.
            - Use "# 📝 [Title]" for the main heading.
            - Use "## [Section]" for categories.
            - Use "●" for main points and "○" for details.
            - **BOLD** critical terms.
            - Separate topics with "---" dividers.
            `;
        } else if (mode === 'quiz') {
            systemPrompt = `
            Act as a professor. Create a challenging 5-question multiple-choice quiz.
            - Title: "# ❓ KNOWLEDGE ASSESSMENT"
            - For each question, use this structure:
              ---
              ### Question [N]
              **[Question Text]**
              * A) [Choice]
              * B) [Choice]
              * C) [Choice]
              * D) [Choice]
            - At the end, add "# 🔑 ANSWER KEY" with brief explanations.
            `;
        } else if (mode === 'flashcards') {
            systemPrompt = `
            Act as a study coach. Create 5 high-impact flashcards.
            - You MUST follow this EXACT format for every card:
              ---
              ## 🎴 CARD [N]
              **FRONT:**
              > [Question/Concept]

              **BACK:**
              > [Detailed Answer/Explanation]
              ---
            `;
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a professional tutor. Output ONLY clean Markdown. Never say 'Sure' or 'Here is your text'." },
                { role: "system", content: systemPrompt },
                { role: "user", content: notesText }
            ],
            model: "llama-3.1-8b-instant", 
            temperature: 0.5, // Keeps results factual and consistent
        });

        return NextResponse.json({ summary: completion.choices[0]?.message?.content || "" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}