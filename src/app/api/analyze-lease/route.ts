import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKey } from "@/config";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contractText = formData.get("contractText") as string | null;
    const locationInfo = (formData.get("locationInfo") as string | null) || "Location not specified";
    const language = (formData.get("language") as string | null) || "English";

    // Validate input: either file or text must be provided
    if (!file && !contractText) {
      return NextResponse.json(
        { error: "Please provide either a PDF file or contract text." },
        { status: 400 }
      );
    }

    if (file && (!file.type || !file.type.includes("pdf"))) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF file." },
        { status: 400 }
      );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing API key. Please set GOOGLE_GEMINI_API_KEY in your .env.local (for local dev) or hosting environment.",
        },
        { status: 500 }
      );
    }

    // Build prompt with enhanced structure from Jiyuan's version
    let contractContent = "";
    let parts: any[] = [];

    if (file) {
      // Handle PDF file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Pdf = buffer.toString("base64");
      
      parts.push({
        inline_data: {
          mime_type: file.type || "application/pdf",
          data: base64Pdf,
        },
      });
    } else if (contractText) {
      // Handle text input
      contractContent = contractText;
    }

    const prompt = `You are a professional rental law advisor. Please generate rental advice for tenants based on the following rental contract and location information. The advice should be concise and point out the parts that tenants might be vulnerable to. The advices shouldn't be too long. It should point out the most important things.

**Location Information:**
${locationInfo}

${contractContent ? `**Rental Contract Content:**
${contractContent}` : "**Rental Contract:** (See attached PDF document)"}

IMPORTANT: Extract the lease start date (move-in date) and lease end date (move-out date) from the document. If you find these dates, include them in the JSON response in YYYY-MM-DD format. If a date is not found or unclear, use null.

Please generate advice in the following structure (respond in ${language}) and return ONLY valid JSON (no extra commentary, no markdown):

{
  "summary": "short plain-language summary of the lease overall",
  "moveInDate": "YYYY-MM-DD or null if not found",
  "moveOutDate": "YYYY-MM-DD or null if not found",
  "importantInfo": [
    "Rent amount and payment method",
    "Lease term and start/end dates",
    "Security deposit amount and refund conditions",
    "Property usage and restrictions",
    "Breach of contract terms",
    "Other important clauses"
  ],
  "easilyForgotten": [
    "Maintenance responsibilities and cost allocation",
    "Conditions for early termination and penalty fees",
    "Property damage compensation standards",
    "Responsibility for utilities (water, electricity, gas, etc.)",
    "Restrictions on subletting or sharing",
    "Other easily overlooked but very important clauses"
  ],
  "legalInfo": [
    "Local rental-related laws and regulations",
    "Tenant rights protection measures",
    "Common rental dispute types and prevention methods",
    "Channels for seeking help when problems arise",
    "Other legal advice based on location"
  ],
  "keyClauses": [
    "important clause in plain language",
    "another important clause"
  ],
  "hiddenFees": [
    "any non-obvious fees, charges, penalties or add-ons"
  ],
  "tenantRisks": [
    "concrete risks or one-sided terms against the tenant"
  ],
  "recommendations": [
    "specific actions the tenant should take or questions to ask the landlord"
  ],
  "questionsForLandlord": [
    "good clarifying question to ask before signing",
    "another question"
  ]
}`.trim();

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Build parts array: always include prompt, add PDF if file exists
    const allParts = [{ text: prompt }, ...parts];

    const body = {
      contents: [
        {
          parts: allParts,
        },
      ],
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Gemini lease API error:", res.status, errorText);
      return NextResponse.json(
        {
          error: `Gemini API error: ${res.status} ${res.statusText}`,
          details: errorText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n");

    if (!text) {
      console.error("❌ Empty lease analysis response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Empty response from Gemini while analyzing lease." },
        { status: 500 }
      );
    }

    try {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("❌ Failed to parse lease JSON:", err.message, text);
      return NextResponse.json(
        {
          error: "Failed to parse Gemini lease response as JSON.",
          details: text.slice(0, 1000),
          parseError: err.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Unexpected lease analysis error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while analyzing lease.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}


