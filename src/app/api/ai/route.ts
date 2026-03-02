import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, pdfData, jobUrl, action, apiKey: clientApiKey } = body;

    // Priority: 1. Client-provided API key (from Admin Dashboard config)
    //           2. Environment variable (for server deployment)
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({ 
        error: "No API key configured!\n\nTo fix this:\n1. Login as admin\n2. Go to Admin → AI Providers\n3. Enable 'Google Gemini' and add your API key\n4. Or add GEMINI_API_KEY to Vercel environment variables\n\nGet a free API key at: https://aistudio.google.com/app/apikey" 
      }, { status: 500 });
    }

    // Handle fetch-models action - validate API key and return available models
    if (action === "fetch-models") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Test the API key by making a simple request
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Say 'OK' in one word.");
        
        // If successful, return the default models for Gemini
        return NextResponse.json({ 
          success: true,
          provider: "Google Gemini",
          models: [
            { name: "gemini-2.0-flash", tags: "Free, Vision, Fast" },
            { name: "gemini-2.0-pro", tags: "Premium, Vision" },
            { name: "gemini-1.5-flash", tags: "Free, Vision" },
            { name: "gemini-1.5-pro", tags: "Premium, Vision" }
          ]
        });
      } catch (error: any) {
        return NextResponse.json({ 
          error: "Invalid API key. Please check your key and try again." 
        }, { status: 401 });
      }
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
