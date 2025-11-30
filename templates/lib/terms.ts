import { db } from "~/server/db";

/**
 * Check if a user needs to accept current terms
 *
 * @param userId - The user's ID from NextAuth session
 * @returns true if user needs to accept terms, false otherwise
 */
export async function checkUserNeedsToAcceptTerms(userId: string): Promise<boolean> {
  // Get current terms
  const currentTerms = await db.terms.findFirst({
    where: { isCurrent: true },
  });

  if (!currentTerms) {
    // No terms to accept (shouldn't happen in production, but handle gracefully)
    return false;
  }

  // Check if user has accepted current terms
  const acceptance = await db.userTermsAcceptance.findUnique({
    where: {
      userId_termsId: {
        userId: userId,
        termsId: currentTerms.id,
      },
    },
  });

  return !acceptance;
}

/**
 * Get the current terms
 *
 * @returns Current terms or null if no terms are set as current
 */
export async function getCurrentTerms() {
  const terms = await db.terms.findFirst({
    where: { isCurrent: true },
  });

  return terms;
}

/**
 * Get all terms versions
 *
 * @returns Array of all terms, ordered by effective date descending
 */
export async function getAllTermsVersions() {
  const terms = await db.terms.findMany({
    orderBy: {
      effectiveDate: 'desc',
    },
  });

  return terms;
}

/**
 * Check if a specific terms version exists
 *
 * @param version - Semantic version string (e.g., "1.0.0")
 * @returns true if terms with this version exist
 */
export async function termsVersionExists(version: string): Promise<boolean> {
  const terms = await db.terms.findFirst({
    where: { version },
  });

  return !!terms;
}
