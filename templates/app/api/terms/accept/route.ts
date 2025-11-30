import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/terms/accept
 * Records user's acceptance of terms
 * Body: { termsId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { termsId } = body;

    if (!termsId || typeof termsId !== "string") {
      return NextResponse.json(
        { error: "termsId is required" },
        { status: 400 }
      );
    }

    // Verify terms exist and are current
    const terms = await db.terms.findFirst({
      where: {
        id: termsId,
        isCurrent: true,
      },
    });

    if (!terms) {
      return NextResponse.json(
        { error: "Terms not found or not current" },
        { status: 404 }
      );
    }

    // Check if user has already accepted these terms
    const existingAcceptance = await db.userTermsAcceptance.findUnique({
      where: {
        userId_termsId: {
          userId: session.user.id,
          termsId: termsId,
        },
      },
    });

    if (existingAcceptance) {
      // Already accepted
      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
      });
    }

    // Ensure user exists in database (handles JWT sessions where user might not be in DB)
    await db.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    });

    // Get IP address from headers
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Record acceptance
    await db.userTermsAcceptance.create({
      data: {
        userId: session.user.id,
        termsId: termsId,
        ipAddress: ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyAccepted: false,
    });
  } catch (error) {
    console.error("Error accepting terms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
