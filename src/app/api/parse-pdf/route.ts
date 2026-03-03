import { NextRequest, NextResponse } from "next/server";

// PDF parsing without AI - uses pdf-parse library
// Version: 2.1-NOAI (Non-AI PDF parsing)

export async function POST(request: NextRequest) {
  try {
    console.log("[parse-pdf] Starting PDF parsing (non-AI method)...");
    
    const body = await request.json();
    const { pdfBase64 } = body;

    if (!pdfBase64) {
      return NextResponse.json({ error: "PDF data is required" }, { status: 400 });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Dynamic import for pdf-parse (ESM compatibility)
    const pdfParse = (await import('pdf-parse')).default;
    
    // Extract text from PDF
    const data = await pdfParse(pdfBuffer);
    
    // Clean up the extracted text
    let cleanText = data.text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive newlines
      .replace(/[^\x20-\x7E\n]/g, '')   // Remove non-printable chars (keep basic ASCII)
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();

    // If text extraction failed or is too short, return error
    if (!cleanText || cleanText.length < 10) {
      return NextResponse.json({ 
        error: "Could not extract text from PDF. The PDF may be image-based or corrupted.\n\nTry uploading a DOCX file instead, or copy-paste your resume text directly." 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      text: cleanText,
      pages: data.numpages,
      chars: cleanText.length,
      _parser: "pdf-parse-non-ai",
      _version: "2.1-NOAI"
    });

  } catch (error: any) {
    console.error("PDF Parse Error:", error);
    return NextResponse.json({ 
      error: "Failed to parse PDF: " + (error.message || "Unknown error") + "\n\nPlease try:\n1. Upload a DOCX file instead\n2. Copy-paste your resume text directly" 
    }, { status: 500 });
  }
}

// Note: In Next.js App Router, body size is handled differently
// The default limit is usually sufficient for PDF uploads
