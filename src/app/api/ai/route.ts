import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, pdfData, jobUrl, action } = body;

    // Get API key from environment variable
    // On Vercel: set GEMINI_API_KEY in your environment variables
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({ 
        error: "AI API key not configured. Please add GEMINI_API_KEY to your Vercel environment variables.\n\nGet a free API key at: https://aistudio.google.com/app/apikey" 
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let result;

    // Handle different action types
    if (action === "parse-pdf" && pdfData) {
      // PDF parsing
      result = await model.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: pdfData } },
        { text: "Extract all text verbatim from this PDF document." }
      ]);
    } else if (action === "fetch-job" && jobUrl) {
      // Job URL fetching with Google Search grounding
      const modelWithSearch = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        tools: [{ googleSearch: {} }] 
      });
      result = await modelWithSearch.generateContent(
        `You are a job analyst. TARGET URL: ${jobUrl}. ACTION: Analyze job listing. TASK: Summarize Title, Company, Responsibilities, Hard Skills, Soft Skills. OUTPUT: Comprehensive summary.`
      );
    } else if (prompt) {
      // Regular prompt
      result = await model.generateContent(prompt);
    } else {
      return NextResponse.json({ error: "Invalid request. Provide prompt, pdfData, or jobUrl." }, { status: 400 });
    }

    const text = result.response.text();
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate content" 
    }, { status: 500 });
  }
}
