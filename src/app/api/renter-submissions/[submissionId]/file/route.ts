import { NextResponse } from "next/server";
import { findSubmission } from "@/server/renterSubmissions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;
  const submission = await findSubmission(submissionId);

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // pdfData is stored as a base64-encoded string of the raw PDF bytes
  const rawData =
    typeof submission.pdfData === "string"
      ? submission.pdfData
      : String(submission.pdfData ?? "");

  const pdfBuffer = Buffer.from(rawData, "base64");
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": submission.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${submission.fileName}"`,
    },
  });
}

