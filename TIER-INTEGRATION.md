# Tier-Based Access Control Integration

**Purpose**: Optional extension to FULL-STACK-SETUP.md that adds B2B SaaS tier/subscription capabilities.

**When to use**: After completing FULL-STACK-SETUP.md and validating core product with real users (Discovery → MVP transition).

**Based on**: Consultant recommendations adapted to Claudian Tier 1 stack (tRPC + Zod instead of REST).

---

## Architecture Overview

### Three-Layer Enforcement
```
┌─────────────────┐
│    Frontend     │  ← UX polish (can be bypassed)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   tRPC Layer    │  ← AUTHORITATIVE GATE (full context)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  ← Safety net (constraints)
└─────────────────┘
```

**Key Principle**: API (tRPC) is the only enforcement point that matters. Frontend gating is UX, database constraints are safety.

### Data Flow
1. User authenticates (NextAuth from base setup)
2. Session includes user + organization
3. tRPC procedures check `canPerformAction(org, action)`
4. Frontend queries entitlements for UX gating
5. Stripe webhooks update org tier in DB

---

## Integration Steps

### Phase 1: Database Schema (10 min)

**Add to existing `prisma/schema.prisma`:**

```prisma
// Add Organization model
model Organization {
  id                    String   @id @default(cuid())
  name                  String

  // Subscription state
  tier                  Tier     @default(STARTER)
  subscriptionStatus    SubscriptionStatus @default(TRIAL)
  trialEndsAt           DateTime?

  // Stripe integration
  stripeCustomerId      String?  @unique
  stripeSubscriptionId  String?  @unique

  // Usage tracking (JSON for flexibility during discovery)
  usage                 Json     @default("{}")

  users                 User[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum Tier {
  STARTER
  PROFESSIONAL
  TEAM
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

// Modify User model to add organization relationship
model User {
  id               String    @id @default(cuid())
  name             String?
  email            String?   @unique
  emailVerified    DateTime?
  image            String?

  // Add organization relationship
  organizationId   String?
  organization     Organization? @relation(fields: [organizationId], references: [id])

  accounts         Account[]
  sessions         Session[]
}
```

**Push schema changes:**
```bash
# Local
npx prisma db push

# Production
DATABASE_URL="$PRODUCTION_DB_URL" npx prisma db push

# Staging
DATABASE_URL="$STAGING_DB_URL" npx prisma db push
```

**Seed with default organization** (optional for testing):
```bash
npx prisma db seed
```

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default organization for existing users
  const defaultOrg = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Default Organization',
      tier: 'TEAM', // Give full access during discovery
      subscriptionStatus: 'ACTIVE',
    },
  });

  // Link all existing users to default org
  await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id },
  });

  console.log('✅ Seeded default organization');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

---

### Phase 2: Tier Configuration (15 min)

**Create `lib/tiers.ts`** (tier config lives in code, not database):

```typescript
/**
 * Tier Configuration
 *
 * Defines capabilities for each subscription tier.
 * Lives in code (not database) for easy deployment of changes.
 *
 * Based on consultant recommendations, adapted for Claudian standards.
 */

export const TIER_CONFIG = {
  STARTER: {
    limits: {
      // Define your product-specific limits
      itemsTracked: 10,
      reportsPerMonth: 5,
      teamMembers: 1,
    },
    features: {
      // Define your product-specific features
      basicReports: true,
      advancedAnalytics: false,
      apiAccess: false,
      dataExport: false,
      customBranding: false,
    },
  },
  PROFESSIONAL: {
    limits: {
      itemsTracked: 50,
      reportsPerMonth: 25,
      teamMembers: 3,
    },
    features: {
      basicReports: true,
      advancedAnalytics: true,
      apiAccess: false,
      dataExport: true,
      customBranding: false,
    },
  },
  TEAM: {
    limits: {
      itemsTracked: Infinity,
      reportsPerMonth: Infinity,
      teamMembers: 10,
    },
    features: {
      basicReports: true,
      advancedAnalytics: true,
      apiAccess: true,
      dataExport: true,
      customBranding: true,
    },
  },
} as const;

export type Tier = keyof typeof TIER_CONFIG;
export type Feature = keyof typeof TIER_CONFIG.STARTER.features;
export type Limit = keyof typeof TIER_CONFIG.STARTER.limits;

/**
 * Find minimum tier that unlocks a feature
 */
export function minimumTierForFeature(feature: Feature): Tier | null {
  const tiers: Tier[] = ['STARTER', 'PROFESSIONAL', 'TEAM'];
  for (const tier of tiers) {
    if (TIER_CONFIG[tier].features[feature]) {
      return tier;
    }
  }
  return null;
}

/**
 * Find next tier with higher limit
 */
export function nextTierForLimit(limit: Limit, currentTier: Tier): Tier | null {
  const tiers: Tier[] = ['STARTER', 'PROFESSIONAL', 'TEAM'];
  const currentIndex = tiers.indexOf(currentTier);
  const currentLimit = TIER_CONFIG[currentTier].limits[limit];

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    if (TIER_CONFIG[tiers[i]].limits[limit] > currentLimit) {
      return tiers[i];
    }
  }
  return null;
}
```

---

### Phase 3: Access Control Logic (20 min)

**Create `lib/access.ts`:**

```typescript
/**
 * Access Control System
 *
 * Provides the authoritative "can this user do this thing?" check.
 * Based on consultant recommendations, adapted for Claudian standards.
 *
 * Key fix from consultant code: Accepts org object (don't re-fetch from DB)
 */

import { TIER_CONFIG, type Tier, type Feature, type Limit } from './tiers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  upgradeToTier?: Tier;
}

export interface OrganizationContext {
  id: string;
  tier: Tier;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt: Date | null;
  usage: Record<string, number>;
}

/**
 * Core access check function
 *
 * IMPORTANT: Pass org from session/context, don't fetch from DB here
 * (consultant code had this as a footgun - extra DB query per check)
 */
export async function canPerformAction(
  org: OrganizationContext,
  action: Feature | Limit,
  quantity: number = 1
): Promise<AccessResult> {

  // 1. Check subscription status
  if (org.subscriptionStatus === 'CANCELED') {
    return { allowed: false, reason: 'Subscription canceled' };
  }

  if (org.subscriptionStatus === 'TRIAL') {
    if (org.trialEndsAt && new Date() > org.trialEndsAt) {
      return { allowed: false, reason: 'Trial expired' };
    }
  }

  // 2. Get tier config
  const tierConfig = TIER_CONFIG[org.tier];

  // 3. Check feature access (boolean gates)
  if (action in tierConfig.features) {
    const hasFeature = tierConfig.features[action as Feature];
    if (!hasFeature) {
      const upgradeTier = minimumTierForFeature(action as Feature);
      return {
        allowed: false,
        reason: `${action} requires ${upgradeTier} plan`,
        upgradeToTier: upgradeTier || undefined,
      };
    }
    return { allowed: true };
  }

  // 4. Check limit access (quantity gates)
  if (action in tierConfig.limits) {
    const limit = tierConfig.limits[action as Limit];
    const currentUsage = org.usage[action] || 0;

    if (currentUsage + quantity > limit) {
      const upgradeTier = nextTierForLimit(action as Limit, org.tier);
      return {
        allowed: false,
        reason: `Limit reached: ${currentUsage}/${limit} ${action}`,
        upgradeToTier: upgradeTier || undefined,
      };
    }
    return { allowed: true };
  }

  // Action not found in config - allow by default (or deny, your choice)
  return { allowed: true };
}

function minimumTierForFeature(feature: Feature): Tier | null {
  const tiers: Tier[] = ['STARTER', 'PROFESSIONAL', 'TEAM'];
  return tiers.find(tier => TIER_CONFIG[tier].features[feature]) || null;
}

function nextTierForLimit(limit: Limit, currentTier: Tier): Tier | null {
  const tiers: Tier[] = ['STARTER', 'PROFESSIONAL', 'TEAM'];
  const currentIndex = tiers.indexOf(currentTier);
  const currentLimit = TIER_CONFIG[currentTier].limits[limit];

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    if (TIER_CONFIG[tiers[i]].limits[limit] > currentLimit) {
      return tiers[i];
    }
  }
  return null;
}

/**
 * Usage tracking helpers
 *
 * IMPORTANT: Wrap these in transactions with your actual mutations
 * (consultant code had this as a footgun - usage could get out of sync)
 */

export async function incrementUsage(
  tx: PrismaClient, // Pass transaction client, not global prisma
  organizationId: string,
  key: string,
  amount: number = 1
): Promise<void> {
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { usage: true },
  });

  const currentUsage = (org?.usage as Record<string, number>) || {};
  const newValue = (currentUsage[key] || 0) + amount;

  await tx.organization.update({
    where: { id: organizationId },
    data: {
      usage: {
        ...currentUsage,
        [key]: newValue,
      },
    },
  });
}

export async function decrementUsage(
  tx: PrismaClient,
  organizationId: string,
  key: string,
  amount: number = 1
): Promise<void> {
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { usage: true },
  });

  const currentUsage = (org?.usage as Record<string, number>) || {};
  const newValue = Math.max(0, (currentUsage[key] || 0) - amount);

  await tx.organization.update({
    where: { id: organizationId },
    data: {
      usage: {
        ...currentUsage,
        [key]: newValue,
      },
    },
  });
}
```

---

### Phase 4: tRPC Integration (30 min)

**Install tRPC dependencies:**
```bash
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next @trpc/next@next
npm install @tanstack/react-query@latest zod
```

**Create `server/trpc.ts`** (tRPC setup):

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrganizationContext } from '@/lib/access';

/**
 * Context available to all tRPC procedures
 */
export async function createContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { session: null, user: null, org: null };
  }

  // Fetch user with organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      organization: true,
    },
  });

  // Transform org for access control
  const org: OrganizationContext | null = user?.organization
    ? {
        id: user.organization.id,
        tier: user.organization.tier as any,
        subscriptionStatus: user.organization.subscriptionStatus as any,
        trialEndsAt: user.organization.trialEndsAt,
        usage: user.organization.usage as Record<string, number>,
      }
    : null;

  return {
    session,
    user,
    org,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user || !ctx.org) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      org: ctx.org, // Guaranteed non-null
    },
  });
});
```

**Create example router** `server/routers/items.ts`:

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { canPerformAction, incrementUsage, decrementUsage } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export const itemsRouter = router({
  /**
   * Create item - gated by itemsTracked limit
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Check access BEFORE doing work
      const access = await canPerformAction(ctx.org, 'itemsTracked', 1);
      if (!access.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: access.reason,
          cause: { upgradeToTier: access.upgradeToTier },
        });
      }

      // 2. Perform mutation + usage tracking in transaction
      const item = await prisma.$transaction(async (tx) => {
        const newItem = await tx.item.create({
          data: {
            name: input.name,
            description: input.description,
            organizationId: ctx.org.id,
          },
        });

        await incrementUsage(tx, ctx.org.id, 'itemsTracked', 1);

        return newItem;
      });

      return item;
    }),

  /**
   * Delete item - decrements usage
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(async (tx) => {
        await tx.item.delete({
          where: { id: input.id },
        });

        await decrementUsage(tx, ctx.org.id, 'itemsTracked', 1);
      });

      return { success: true };
    }),

  /**
   * Export data - gated by dataExport feature
   */
  export: protectedProcedure.query(async ({ ctx }) => {
    // Check feature access
    const access = await canPerformAction(ctx.org, 'dataExport');
    if (!access.allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: access.reason,
        cause: { upgradeToTier: access.upgradeToTier },
      });
    }

    // Generate export
    const items = await prisma.item.findMany({
      where: { organizationId: ctx.org.id },
    });

    return {
      data: items,
      format: 'json',
    };
  }),
});
```

**Create root router** `server/routers/_app.ts`:

```typescript
import { router } from '../trpc';
import { itemsRouter } from './items';
import { entitlementsRouter } from './entitlements';

export const appRouter = router({
  items: itemsRouter,
  entitlements: entitlementsRouter,
});

export type AppRouter = typeof appRouter;
```

**Create entitlements router** `server/routers/entitlements.ts`:

```typescript
import { router, protectedProcedure } from '../trpc';
import { TIER_CONFIG, Tier } from '@/lib/tiers';

export const entitlementsRouter = router({
  /**
   * Get current user's entitlements
   * Used by frontend for UI gating
   */
  get: protectedProcedure.query(({ ctx }) => {
    const tierConfig = TIER_CONFIG[ctx.org.tier as Tier];
    const usage = ctx.org.usage;

    // Build limits with current usage
    const limits: Record<string, { used: number; max: number }> = {};
    for (const [key, max] of Object.entries(tierConfig.limits)) {
      limits[key] = {
        used: usage[key] || 0,
        max: max as number,
      };
    }

    // Determine upgrade options
    const tierOrder: Tier[] = ['STARTER', 'PROFESSIONAL', 'TEAM'];
    const currentIndex = tierOrder.indexOf(ctx.org.tier as Tier);
    const upgradeOptions = tierOrder.slice(currentIndex + 1);

    return {
      tier: ctx.org.tier,
      status: ctx.org.subscriptionStatus,
      trialEndsAt: ctx.org.trialEndsAt,
      features: tierConfig.features,
      limits,
      upgradeOptions,
    };
  }),
});
```

**Create API route** `app/api/trpc/[trpc]/route.ts`:

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

---

### Phase 5: Frontend Integration (30 min)

**Create tRPC client** `lib/trpc.ts`:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function getTRPCUrl() {
  if (typeof window !== 'undefined') {
    return '/api/trpc';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/trpc`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}/api/trpc`;
}

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getTRPCUrl(),
    }),
  ],
});
```

**Create tRPC provider** `components/trpc-provider.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, trpcClient } from '@/lib/trpc';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**Update root layout** to include TRPCProvider:

```typescript
import { SessionProvider } from '@/components/session-provider';
import { TRPCProvider } from '@/components/trpc-provider';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Create entitlements hook** `hooks/useEntitlements.ts`:

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function useEntitlements() {
  const { data, isLoading, error, refetch } = trpc.entitlements.get.useQuery();

  return {
    entitlements: data,
    isLoading,
    error,
    refresh: refetch,

    // Convenience methods
    hasFeature: (feature: string): boolean => {
      return data?.features?.[feature as keyof typeof data.features] ?? false;
    },

    getLimit: (limit: string): { used: number; max: number } => {
      return data?.limits?.[limit] ?? { used: 0, max: 0 };
    },

    canUseMore: (limit: string): boolean => {
      const l = data?.limits?.[limit];
      return l ? l.used < l.max : false;
    },

    isAtLimit: (limit: string): boolean => {
      const l = data?.limits?.[limit];
      return l ? l.used >= l.max : true;
    },

    tier: data?.tier,
    status: data?.status,
    isActive: data?.status === 'ACTIVE' || data?.status === 'TRIAL',
    canUpgrade: (data?.upgradeOptions?.length ?? 0) > 0,
  };
}
```

**Create UI gating components** `components/feature-gate.tsx`:

```typescript
'use client';

import { useEntitlements } from '@/hooks/useEntitlements';
import { UpgradePrompt } from './upgrade-prompt';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useEntitlements();

  if (isLoading) {
    return null; // Or skeleton
  }

  if (!hasFeature(feature)) {
    return fallback ?? <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}
```

**Create upgrade prompt** `components/upgrade-prompt.tsx`:

```tsx
'use client';

import { useEntitlements } from '@/hooks/useEntitlements';

interface UpgradePromptProps {
  feature?: string;
  limit?: string;
  message?: string;
}

export function UpgradePrompt({ feature, limit, message }: UpgradePromptProps) {
  const { entitlements } = useEntitlements();

  const upgradeUrl = '/settings/billing'; // Or link to pricing page

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
      <h3 className="text-h4 text-neutral-900 mb-2">
        Upgrade Required
      </h3>
      <p className="text-body text-neutral-600 mb-4">
        {message ||
          (feature
            ? `This feature requires a ${entitlements?.upgradeOptions?.[0]} plan or higher.`
            : limit
            ? `You've reached your plan limit.`
            : 'Please upgrade to continue.')}
      </p>
      <a
        href={upgradeUrl}
        className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-button text-white hover:bg-primary-700"
      >
        View Plans
      </a>
    </div>
  );
}
```

---

### Phase 6: Development Tooling (15 min)

**Purpose**: Make tier testing easy without Stripe integration.

#### Option A: Dev Tier Switcher Component (Recommended)

**Add admin endpoint** `server/routers/admin.ts`:

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const adminRouter = router({
  /**
   * Set tier for testing (dev only)
   */
  setTier: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['STARTER', 'PROFESSIONAL', 'TEAM']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Dev only');
      }

      // Update current user's organization
      await prisma.organization.update({
        where: { id: ctx.org.id },
        data: {
          tier: input.tier,
          subscriptionStatus: 'ACTIVE',
        },
      });

      return { success: true, tier: input.tier };
    }),

  /**
   * Reset usage counters (dev only)
   */
  resetUsage: protectedProcedure.mutation(async ({ ctx }) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Dev only');
    }

    await prisma.organization.update({
      where: { id: ctx.org.id },
      data: { usage: {} },
    });

    return { success: true };
  }),
});
```

**Update root router** to include admin:

```typescript
// server/routers/_app.ts
import { adminRouter } from './admin';

export const appRouter = router({
  items: itemsRouter,
  entitlements: entitlementsRouter,
  admin: adminRouter, // Add this
});
```

**Create dev tier switcher** `components/dev-tier-switcher.tsx`:

```tsx
'use client';

import { trpc } from '@/lib/trpc';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useState } from 'react';

export function DevTierSwitcher() {
  const { entitlements, refresh } = useEntitlements();
  const setTier = trpc.admin.setTier.useMutation();
  const resetUsage = trpc.admin.resetUsage.useMutation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const switchTier = async (tier: 'STARTER' | 'PROFESSIONAL' | 'TEAM') => {
    await setTier.mutateAsync({ tier });
    refresh();
  };

  const handleResetUsage = async () => {
    await resetUsage.mutateAsync();
    refresh();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-warning-600 text-white rounded-full w-12 h-12 shadow-lg hover:bg-warning-700 flex items-center justify-center text-h5"
          title="Dev Tools"
        >
          🔧
        </button>
      ) : (
        <div className="bg-warning-100 border-2 border-warning-400 rounded-lg p-4 shadow-xl min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-h5 text-warning-900 font-semibold">
              Dev Tools
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-warning-700 hover:text-warning-900 text-h4"
            >
              ×
            </button>
          </div>

          {/* Current Tier */}
          <div className="mb-3 p-2 bg-warning-50 rounded border border-warning-200">
            <p className="text-caption text-warning-800 mb-1">Current Tier</p>
            <p className="text-body font-semibold text-warning-900">
              {entitlements?.tier || 'Loading...'}
            </p>
          </div>

          {/* Usage Stats */}
          {entitlements?.limits && (
            <div className="mb-3 p-2 bg-warning-50 rounded border border-warning-200">
              <p className="text-caption text-warning-800 mb-1">Usage</p>
              {Object.entries(entitlements.limits).map(([key, value]) => (
                <div key={key} className="text-body-sm text-warning-900">
                  {key}: {value.used}/{value.max === Infinity ? '∞' : value.max}
                </div>
              ))}
            </div>
          )}

          {/* Tier Switcher */}
          <div className="mb-3">
            <p className="text-caption text-warning-800 mb-2">Switch Tier</p>
            <div className="flex gap-2">
              <button
                onClick={() => switchTier('STARTER')}
                disabled={entitlements?.tier === 'STARTER'}
                className="flex-1 px-3 py-2 bg-warning-600 text-white rounded text-button hover:bg-warning-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                START
              </button>
              <button
                onClick={() => switchTier('PROFESSIONAL')}
                disabled={entitlements?.tier === 'PROFESSIONAL'}
                className="flex-1 px-3 py-2 bg-warning-600 text-white rounded text-button hover:bg-warning-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PRO
              </button>
              <button
                onClick={() => switchTier('TEAM')}
                disabled={entitlements?.tier === 'TEAM'}
                className="flex-1 px-3 py-2 bg-warning-600 text-white rounded text-button hover:bg-warning-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                TEAM
              </button>
            </div>
          </div>

          {/* Reset Usage */}
          <button
            onClick={handleResetUsage}
            className="w-full px-3 py-2 bg-error-600 text-white rounded text-button hover:bg-error-700"
          >
            Reset Usage Counters
          </button>

          <p className="text-caption text-warning-700 mt-2 text-center">
            Development Mode Only
          </p>
        </div>
      )}
    </div>
  );
}
```

**Add to dashboard layout** `app/dashboard/layout.tsx`:

```tsx
import { DevTierSwitcher } from '@/components/dev-tier-switcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <DevTierSwitcher />
    </div>
  );
}
```

#### Option B: Prisma Studio (Quick & Simple)

For quick tier changes without writing code:

```bash
npx prisma studio

# 1. Open Organization table
# 2. Edit tier field directly
# 3. Change TEAM → STARTER → test limits
# 4. Refresh your app to see changes
```

#### Option C: Environment Variable Override

For automated testing scripts:

```typescript
// lib/access.ts - add at the top of canPerformAction()
export async function canPerformAction(
  org: OrganizationContext,
  action: Feature | Limit,
  quantity: number = 1
): Promise<AccessResult> {

  // DEV MODE: Override tier via env var
  if (process.env.NODE_ENV === 'development' && process.env.DEV_TIER) {
    org = { ...org, tier: process.env.DEV_TIER as Tier };
  }

  // ... rest of function
}
```

Then test different tiers:

```bash
# Test as STARTER
DEV_TIER=STARTER npm run dev

# Test as PROFESSIONAL
DEV_TIER=PROFESSIONAL npm run dev

# Test as TEAM (or no override)
npm run dev
```

---

### Phase 7: Stripe Integration (Later)

**Note**: Skip this during discovery phase. Add when you're ready to charge customers.

See consultant recommendations for:
- Stripe webhook handler
- Checkout session creator
- Customer portal integration

**Key Claudian adaptations**:
- Use tRPC procedure for checkout (not REST route)
- Store Stripe price IDs in environment variables (not hardcoded)
- Use Stripe metadata for tier mapping (not hardcoded map)

---

## Discovery Phase Pattern: Tiers Without Billing

**During discovery**, set all users to `TEAM` tier:

```typescript
// prisma/seed.ts
const defaultOrg = await prisma.organization.create({
  data: {
    name: 'Default Organization',
    tier: 'TEAM', // Full access during discovery
    subscriptionStatus: 'ACTIVE',
  },
});
```

**Why**:
- Focus on product value, not billing UX
- Validate features with real usage before gating them
- Gather data on which features drive upgrade intent

**When to add billing**:
- After 5-10 paying customers confirmed they'd pay
- When you have clear signal on pricing ($X/month feels right)
- When usage patterns inform tier boundaries

---

## Testing Strategy

### Manual Testing with Dev Tier Switcher

**The easiest way to test tiers** is using the DevTierSwitcher component (Phase 6):

1. **Start your app**: `npm run dev`
2. **Sign in**: Navigate to your dashboard
3. **Open dev tools**: Click the 🔧 button in bottom-right corner
4. **Switch tiers**: Click STARTER → PRO → TEAM buttons
5. **Test limits**: Create items until you hit limits, see upgrade prompts
6. **Reset usage**: Click "Reset Usage Counters" to clear limits

**Manual Test Plan:**

```markdown
## STARTER Tier Tests
- [ ] Switch to STARTER tier using dev tools
- [ ] Create 10 items (should succeed)
- [ ] Try to create 11th item (should fail with upgrade prompt)
- [ ] Try to access Advanced Analytics page (should show FeatureGate)
- [ ] Try to export data (should fail)
- [ ] Verify upgrade prompt shows "PROFESSIONAL" as next tier

## PROFESSIONAL Tier Tests
- [ ] Reset usage counters
- [ ] Switch to PROFESSIONAL tier
- [ ] Create 50 items (should succeed)
- [ ] Try to create 51st item (should fail)
- [ ] Access Advanced Analytics page (should work)
- [ ] Export data (should work)
- [ ] Try to access API docs (should show FeatureGate for TEAM)

## TEAM Tier Tests
- [ ] Switch to TEAM tier
- [ ] Create 100+ items (should work, no limit)
- [ ] Access all features (should work)
- [ ] Verify no upgrade prompts appear anywhere

## Downgrade Flow
- [ ] Start as TEAM with 50 items
- [ ] Switch to STARTER (limit: 10)
- [ ] Verify: Still see all 50 items
- [ ] Verify: Cannot create item #51 (over limit)
- [ ] Delete items down to 9
- [ ] Verify: Can now create new items again
```

### Integration Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { canPerformAction } from '@/lib/access';

describe('Tier Gating', () => {
  it('STARTER cannot access advancedAnalytics', async () => {
    const org = {
      id: 'test-org',
      tier: 'STARTER' as const,
      subscriptionStatus: 'ACTIVE' as const,
      trialEndsAt: null,
      usage: {},
    };

    const result = await canPerformAction(org, 'advancedAnalytics');
    expect(result.allowed).toBe(false);
  });

  it('PROFESSIONAL can create up to 50 items', async () => {
    const org = {
      id: 'test-org',
      tier: 'PROFESSIONAL' as const,
      subscriptionStatus: 'ACTIVE' as const,
      trialEndsAt: null,
      usage: { itemsTracked: 49 },
    };

    const result = await canPerformAction(org, 'itemsTracked', 1);
    expect(result.allowed).toBe(true);
  });

  it('PROFESSIONAL blocked at 50 items', async () => {
    const org = {
      id: 'test-org',
      tier: 'PROFESSIONAL' as const,
      subscriptionStatus: 'ACTIVE' as const,
      trialEndsAt: null,
      usage: { itemsTracked: 50 },
    };

    const result = await canPerformAction(org, 'itemsTracked', 1);
    expect(result.allowed).toBe(false);
    expect(result.upgradeToTier).toBe('TEAM');
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('upgrade prompt appears when feature locked', async ({ page }) => {
  // Setup: Create user with STARTER tier
  await setupTestUser({ tier: 'STARTER' });

  // Navigate to feature requiring PROFESSIONAL
  await page.goto('/analytics/advanced');

  // Expect upgrade prompt
  await expect(page.locator('text=Upgrade Required')).toBeVisible();
  await expect(page.locator('text=View Plans')).toBeVisible();
});

test('create item blocked at limit', async ({ page }) => {
  // Setup: STARTER user at 10/10 items
  await setupTestUser({ tier: 'STARTER', usage: { itemsTracked: 10 } });

  await page.goto('/items');
  await page.click('[data-testid="create-item"]');

  // Expect error message
  await expect(page.locator('text=Limit reached')).toBeVisible();
});
```

---

## Rollout Plan

### Week 1: Foundation (4-5 hours)
- [ ] Add Organization model to schema (Phase 1)
- [ ] Run migrations on local/staging/production
- [ ] Create tier configuration (Phase 2)
- [ ] Build access control logic (Phase 3)
- [ ] Write unit tests for access checks

### Week 2: tRPC Integration (4-5 hours)
- [ ] Set up tRPC router (Phase 4)
- [ ] Convert 1-2 critical mutations to use access checks
- [ ] Create entitlements endpoint
- [ ] Test in local environment with Prisma Studio

### Week 3: Frontend UX (4-5 hours)
- [ ] Set up tRPC client (Phase 5)
- [ ] Build useEntitlements hook
- [ ] Create FeatureGate and UpgradePrompt components
- [ ] Add gating to 2-3 key features
- [ ] Build DevTierSwitcher component (Phase 6)
- [ ] Test upgrade UX flow using dev tools

### Week 4: Production Validation (2-3 hours)
- [ ] Deploy to staging
- [ ] Manual testing of all tier boundaries using DevTierSwitcher
- [ ] Deploy to production (still with TEAM tier for all)
- [ ] Verify dev tools don't appear in production (NODE_ENV check)

### Later: Billing (When Ready - 8-10 hours)
- [ ] Set up Stripe products and prices
- [ ] Build pricing page
- [ ] Implement checkout flow (Phase 7)
- [ ] Add webhook handler
- [ ] Remove DevTierSwitcher (or keep for admin testing)
- [ ] Migrate users to real tiers

---

## Maintenance

### Adding a New Feature
1. Add to `TIER_CONFIG` features
2. Add access check in tRPC procedure
3. Add `<FeatureGate>` in UI
4. Add integration test

### Adding a New Limit
1. Add to `TIER_CONFIG` limits
2. Add access check + usage tracking in tRPC procedure
3. Add limit display in UI
4. Add integration test

### Changing Tier Boundaries
1. Update `TIER_CONFIG` (code change, not migration)
2. Deploy to staging → test → deploy to production
3. Changes apply immediately (no database migration)

---

## Key Differences from Consultant Recommendations

### ✅ Improvements We Made
1. **Pass org object** (don't re-fetch from DB in every access check)
2. **Transaction wrappers** (usage tracking in same transaction as mutation)
3. **tRPC instead of REST** (Claudian Tier 1 stack)
4. **Design system tokens** (all UI uses Claudian tokens, no hardcoded Tailwind)
5. **Discovery-friendly** (easy to deploy with tiers but without billing)

### 🔄 Kept from Consultants
1. **Three-layer enforcement** (API authoritative, frontend UX, DB safety)
2. **Config in code** (not database - deployable changes)
3. **Graceful degradation** (downgrades don't delete data)
4. **JSON usage field** (flexible during discovery)
5. **Stripe as source of truth** (webhook updates DB)

---

## Quick Reference: Testing Tiers Without Stripe

### Dev Tier Switcher (Recommended)
- **What**: Floating 🔧 button in bottom-right corner (dev mode only)
- **Provides**: Instant tier switching, usage display, reset counters
- **Setup**: Phase 6 - 15 minutes to implement
- **Use Case**: Daily development, manual testing, demos

### Prisma Studio (Quick & Easy)
- **What**: `npx prisma studio` → edit Organization table
- **Provides**: Direct database manipulation
- **Setup**: Zero - comes with Prisma
- **Use Case**: Quick tier changes, data inspection

### Environment Variable (Automated)
- **What**: `DEV_TIER=STARTER npm run dev`
- **Provides**: Override tier via env var
- **Setup**: Add 3 lines to `lib/access.ts`
- **Use Case**: CI/CD testing, automated scripts

**Bottom line**: Use DevTierSwitcher for the best experience. It's visual, instant, and includes usage stats.

---

**Last Updated**: 2025-12-02
**Status**: Ready for integration into products
**Recommended Use**: After FULL-STACK-SETUP.md completes and core product validated
**Testing**: No Stripe required - use DevTierSwitcher for tier testing
