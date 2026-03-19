import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
    return NextResponse.json({ message: "API is working" });
}

export async function POST(req: Request) {
    try {
        const { notesText, mode } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) 
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Task: ${mode}\nContent: ${notesText}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;

        return NextResponse.json({ summary: response.text() });

    } catch (error: any) {
        if (error.message?.includes("429") || error.status === 429) {
            return NextResponse.json(
                { summary: "Rate limit reached. AHAK NA POYA." }, 
                { status: 429 }
            );
        }
        return NextResponse.json({ summary: "AI Error: " + error.message }, { status: 500 });
    }
}