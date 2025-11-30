import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const termsRouter = createTRPCRouter({
  /**
   * Get current terms and check if user needs to accept
   * Protected: Requires authentication
   */
  getCurrentTermsStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // Get current terms
      const currentTerms = await ctx.db.terms.findFirst({
        where: { isCurrent: true },
      });

      if (!currentTerms) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No current terms found"
        });
      }

      // Check if user has accepted current terms
      const acceptance = await ctx.db.userTermsAcceptance.findUnique({
        where: {
          userId_termsId: {
            userId: userId,
            termsId: currentTerms.id,
          },
        },
      });

      return {
        needsAcceptance: !acceptance,
        currentTerms: {
          id: currentTerms.id,
          version: currentTerms.version,
          content: currentTerms.content,
          effectiveDate: currentTerms.effectiveDate,
        },
      };
    }),

  /**
   * Accept current terms
   * Protected: Requires authentication
   */
  acceptTerms: protectedProcedure
    .input(z.object({
      termsId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify terms exist and are current
      const terms = await ctx.db.terms.findFirst({
        where: {
          id: input.termsId,
          isCurrent: true
        },
      });

      if (!terms) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Terms not found or not current"
        });
      }

      // Check if user has already accepted these terms
      const existingAcceptance = await ctx.db.userTermsAcceptance.findUnique({
        where: {
          userId_termsId: {
            userId: userId,
            termsId: input.termsId,
          },
        },
      });

      if (existingAcceptance) {
        // Already accepted, no need to create duplicate
        return { success: true, alreadyAccepted: true };
      }

      // Get IP address from headers (Next.js provides these via tRPC context)
      const ipAddress =
        ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        ctx.headers?.get('x-real-ip') ??
        'unknown';

      // Record acceptance
      await ctx.db.userTermsAcceptance.create({
        data: {
          userId: userId,
          termsId: input.termsId,
          ipAddress: ipAddress,
        },
      });

      return { success: true, alreadyAccepted: false };
    }),

  /**
   * Get current terms (public endpoint for display)
   * Public: Does not require authentication
   */
  getCurrentTerms: publicProcedure
    .query(async ({ ctx }) => {
      const terms = await ctx.db.terms.findFirst({
        where: { isCurrent: true },
      });

      if (!terms) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No current terms found"
        });
      }

      return terms;
    }),

  /**
   * Get user's terms acceptance history
   * Protected: Requires authentication
   */
  getUserAcceptances: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const acceptances = await ctx.db.userTermsAcceptance.findMany({
        where: { userId },
        include: {
          terms: {
            select: {
              version: true,
              effectiveDate: true,
            },
          },
        },
        orderBy: {
          acceptedAt: 'desc',
        },
      });

      return acceptances;
    }),
});
