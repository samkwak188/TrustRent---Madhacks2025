import { NextResponse } from "next/server";
import { getInvitationPreview } from "@/server/companyRegistration";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await getInvitationPreview(token);
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or no longer valid." },
        { status: 404 }
      );
    }
    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("Failed to load invitation", error);
    return NextResponse.json(
      { error: "Unable to load invitation. Please try again." },
      { status: 500 }
    );
  }
}

