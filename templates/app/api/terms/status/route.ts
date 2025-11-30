import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/terms/status
 * Returns current terms and whether the logged-in user needs to accept them
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current terms
    const currentTerms = await db.terms.findFirst({
      where: { isCurrent: true },
    });

    if (!currentTerms) {
      return NextResponse.json(
        { error: "No current terms found" },
        { status: 404 }
      );
    }

    // Check if user has accepted current terms
    const acceptance = await db.userTermsAcceptance.findUnique({
      where: {
        userId_termsId: {
          userId: session.user.id,
          termsId: currentTerms.id,
        },
      },
    });

    return NextResponse.json({
      needsAcceptance: !acceptance,
      currentTerms: {
        id: currentTerms.id,
        version: currentTerms.version,
        content: currentTerms.content,
        effectiveDate: currentTerms.effectiveDate,
      },
    });
  } catch (error) {
    console.error("Error fetching terms status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
