import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertSubmission } from "@/server/renterSubmissions";
import { requireRenterSession } from "@/server/renterAuth";

export const runtime = "nodejs";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional().nullable(),
  apartmentName: z.string().min(2, "Apartment name is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  moveInDate: z.string().min(1, "Move-in date is required"),
  moveOutDate: z.string().optional().nullable(),
});

const GRACE_PERIOD_DAYS = 7;

function isWithinGracePeriod(moveInDate: string) {
  const moveIn = new Date(moveInDate);
  if (Number.isNaN(moveIn.getTime())) {
    return false;
  }
  const diffMs = Date.now() - moveIn.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= GRACE_PERIOD_DAYS + 1e-6;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure we are dealing with an authenticated renter so the submission
    // is always tied to the correct renter record used by the admin dashboard.
    const renter = await requireRenterSession();

    const formData = await request.formData();
    const pdfFile = formData.get("pdf");

    if (!(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: "PDF inspection report is missing" },
        { status: 400 }
      );
    }

    const payload = formSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      apartmentName: formData.get("apartmentName"),
      unitNumber: formData.get("unitNumber"),
      moveInDate: formData.get("moveInDate"),
      moveOutDate: formData.get("moveOutDate"),
    });

    if (!payload.success) {
      return NextResponse.json(
        {
          error: "Please double check the renter details",
          details: payload.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (!isWithinGracePeriod(payload.data.moveInDate)) {
      return NextResponse.json(
        {
          error:
            "The 7-day move-in grace period has passed. Contact support to make changes.",
        },
        { status: 403 }
      );
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const submission = await upsertSubmission({
      renterId: renter.id,
      fileName: pdfFile.name || "inspection-report.pdf",
      mimeType: pdfFile.type || "application/pdf",
      pdfData: pdfBuffer,
      moveInDate: payload.data.moveInDate,
      moveOutDate: payload.data.moveOutDate || null,
    });

    return NextResponse.json(
      {
        ok: true,
        renterId: renter.id,
        submissionId: submission.id,
        submittedAt: submission.submittedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to persist renter submission", error);
    return NextResponse.json(
      {
        error: "Something went wrong while saving the inspection report.",
      },
      { status: 500 }
    );
  }
}

