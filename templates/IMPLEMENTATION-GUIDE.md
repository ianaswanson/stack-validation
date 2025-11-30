# Terms of Service Implementation Guide

Complete guide for implementing Terms of Service acceptance in your Next.js application.

## Table of Contents

1. [Overview](#overview)
2. [Choose Your Approach](#choose-your-approach)
3. [Database Setup](#database-setup)
4. [Implementation: API Routes (Standard Next.js)](#implementation-api-routes)
5. [Implementation: tRPC (T3 Stack)](#implementation-trpc)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**What you get:**
- Per-user terms acceptance tracking
- Version management for terms updates
- Scroll-to-accept UX pattern
- Explicit checkbox acknowledgment
- Full audit trail (IP address, timestamp)
- React components with loading/error states

**Base Requirements (Both Approaches):**
- Next.js 14+ (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- Tailwind CSS
- react-markdown

---

## Choose Your Approach

### API Routes Approach (Recommended for Most Projects)

**Use this if:**
- ✅ Standard Next.js project
- ✅ Want minimal dependencies
- ✅ Don't already use tRPC

**Files you'll use:**
- `app/api/terms/status/route.ts`
- `app/api/terms/accept/route.ts`
- `lib/db.ts`
- `lib/hooks/useTermsStatus.ts`
- `components/terms/*`

### tRPC Approach

**Use this if:**
- ✅ Using T3 Stack or create-t3-app
- ✅ Already have tRPC configured
- ✅ Want end-to-end type safety

**Files you'll use:**
- `server/api/routers/terms.ts`
- `lib/terms.ts`
- `components/terms/*`

---

## Database Setup

**(Same for both approaches)**

### 1. Update Prisma Schema

Copy the Terms models from `templates/prisma/schema-with-terms.prisma`:

```prisma
model Terms {
  id            String   @id @default(cuid())
  version       String
  content       String   @db.Text
  effectiveDate DateTime
  createdAt     DateTime @default(now())
  isCurrent     Boolean  @default(false)
  acceptances   UserTermsAcceptance[]
  @@index([isCurrent])
}

model UserTermsAcceptance {
  id         String   @id @default(cuid())
  userId     String
  termsId    String
  acceptedAt DateTime @default(now())
  ipAddress  String?
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  terms      Terms    @relation(fields: [termsId], references: [id], onDelete: Cascade)
  @@unique([userId, termsId])
  @@index([userId])
}
```

**Also update your User model:**

```prisma
model User {
  // ... existing fields
  termsAcceptances UserTermsAcceptance[]
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_terms_of_service
# OR if in non-interactive environment:
npx prisma db push
```

### 3. Create Terms Content

```bash
cp -r templates/legal ./
```

Edit `legal/terms-of-service-v1.md` and replace placeholders:
- `[EFFECTIVE_DATE]`, `[PRODUCT_NAME]`, `[COMPANY_NAME]`, etc.

### 4. Seed Database

```bash
cp templates/prisma/seed-terms.ts prisma/
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:seed:terms": "tsx prisma/seed-terms.ts"
  }
}
```

Run seed:
```bash
npm install tsx  # if not already installed
npm run db:seed:terms
```

### 5. Install Dependencies

```bash
npm install react-markdown
```

---

## Implementation: API Routes

**(Standard Next.js - No tRPC)**

### Step 1: Copy Database Client

```bash
cp templates/lib/db.ts lib/
```

This creates a singleton Prisma client instance.

### Step 2: Copy API Routes

```bash
mkdir -p app/api/terms/status app/api/terms/accept
cp templates/app/api/terms/status/route.ts app/api/terms/status/
cp templates/app/api/terms/accept/route.ts app/api/terms/accept/
```

These create:
- `GET /api/terms/status` - Returns current terms and acceptance status
- `POST /api/terms/accept` - Records user acceptance

### Step 3: Copy React Hooks

```bash
mkdir -p lib/hooks
cp templates/lib/hooks/useTermsStatus.ts lib/hooks/
```

This provides:
- `useTermsStatus()` - Fetches terms status
- `useAcceptTerms()` - Mutation for accepting terms

### Step 4: Copy Components

```bash
mkdir -p components/terms
cp templates/components/terms/TermsDisplay.tsx components/terms/
cp templates/components/terms/TermsModal.tsx components/terms/
cp templates/components/terms/TermsGate.tsx components/terms/
```

### Step 5: Integrate into Your App

Wrap your protected content with `<TermsGate>`:

```typescript
// app/dashboard/page.tsx
import { TermsGate } from "@/components/terms/TermsGate";

export default function DashboardPage() {
  return (
    <TermsGate>
      <div>Your protected content here</div>
    </TermsGate>
  );
}
```

### Important: JWT Session Fix

If you're using NextAuth with JWT sessions (common in development), the API route includes a fix to ensure users exist in the database:

```typescript
// This is already in templates/app/api/terms/accept/route.ts
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
```

This handles the case where:
- NextAuth uses JWT sessions (no database user record)
- User tries to accept terms
- Foreign key constraint would fail without this upsert

---

## Implementation: tRPC

**(T3 Stack / tRPC Projects)**

### Step 1: Copy tRPC Router

```bash
cp templates/server/api/routers/terms.ts src/server/api/routers/
```

### Step 2: Register Router

In `src/server/api/root.ts`:

```typescript
import { termsRouter } from "./routers/terms";

export const appRouter = createTRPCRouter({
  // ... existing routers
  terms: termsRouter,
});
```

### Step 3: Copy Helper Functions

```bash
cp templates/lib/terms.ts src/lib/
```

### Step 4: Copy Components

```bash
cp -r templates/components/terms src/components/
```

**Note:** The tRPC version of components uses `api.terms.*` instead of custom hooks.

### Step 5: Update Components for tRPC

The template components are designed for API Routes. For tRPC, update imports in:

**TermsModal.tsx:**
```typescript
import { api } from '~/trpc/react';

// Replace useAcceptTerms() with:
const acceptTermsMutation = api.terms.acceptTerms.useMutation({
  onSuccess: () => onAccepted(),
});
```

**TermsGate.tsx:**
```typescript
import { api } from '~/trpc/react';

// Replace useTermsStatus() with:
const { data: termsStatus, isLoading, error } = api.terms.getCurrentTermsStatus.useQuery();
```

### Step 6: Integrate into Your App

Same as API Routes approach - wrap with `<TermsGate>`.

---

## Testing

### 1. Start Your Dev Server

```bash
npm run dev
```

### 2. Test the Flow

1. **Sign out** if currently signed in
2. **Sign in** with a new account
3. **Terms modal should appear**
4. Try accepting without scrolling → Button disabled
5. **Scroll to bottom** → Warning disappears
6. **Check acknowledgment box** → Button enables
7. **Click "Accept Terms"** → Modal closes
8. **Verify** you reach the protected content

### 3. Verify Database

```bash
npx prisma studio
```

Check:
- `Terms` table has one record with `isCurrent = true`
- `UserTermsAcceptance` table has your acceptance record
- `User` table has your user (important for JWT sessions)

### 4. Test Persistence

1. Sign out
2. Sign back in
3. Modal should NOT appear (already accepted)

---

## Troubleshooting

### "No current terms found" Error

**Cause:** No terms in database with `isCurrent = true`

**Fix:**
```bash
npm run db:seed:terms
```

### Foreign Key Constraint Violation (API Routes)

**Cause:** User from JWT session doesn't exist in database

**Fix:** Already handled in `templates/app/api/terms/accept/route.ts` with user upsert.

If you're seeing this error, make sure you copied the latest version of the accept route.

### Terms Modal Doesn't Appear

**Cause:** User already accepted terms

**Fix (for testing):**
```bash
npx prisma studio
# Delete the record from UserTermsAcceptance table
```

Or sign in with a different account.

### "Failed to accept terms" Error

**Check:**
1. Open browser console for detailed error
2. Check server logs for the actual error
3. Verify database connection is working
4. Ensure user session exists

### Scroll Detection Doesn't Work

**Cause:** Content is shorter than viewport

**Fix:** Already handled - if content fits without scrolling, `hasScrolledToBottom` is automatically set to `true`.

### IP Address Shows "unknown"

**Cause:** Running locally without reverse proxy

**Expected:** In production on Vercel, `x-forwarded-for` header is automatically set. Locally, "unknown" is normal.

---

## File Structure Summary

### API Routes Approach

```
/app/api/terms/
  status/route.ts          # GET current terms status
  accept/route.ts          # POST accept terms

/lib/
  db.ts                    # Prisma client singleton
  hooks/useTermsStatus.ts  # React hooks for API calls

/components/terms/
  TermsDisplay.tsx         # Markdown renderer
  TermsModal.tsx           # Modal UI (uses hooks)
  TermsGate.tsx            # Wrapper component (uses hooks)

/prisma/
  schema.prisma            # With Terms models
  seed-terms.ts            # Seed script

/legal/
  terms-of-service-v1.md   # Terms content
```

### tRPC Approach

```
/src/server/api/routers/
  terms.ts                 # tRPC router

/src/lib/
  terms.ts                 # Helper functions

/src/components/terms/
  TermsDisplay.tsx         # Markdown renderer
  TermsModal.tsx           # Modal UI (uses tRPC)
  TermsGate.tsx            # Wrapper component (uses tRPC)

/prisma/
  schema.prisma            # With Terms models
  seed-terms.ts            # Seed script

/legal/
  terms-of-service-v1.md   # Terms content
```

---

## Key Differences: API Routes vs tRPC

| Feature | API Routes | tRPC |
|---------|-----------|------|
| **Type Safety** | Request/response types manual | End-to-end automatic |
| **Data Fetching** | Custom hooks with fetch() | tRPC React Query hooks |
| **Dependencies** | None (built-in Next.js) | @trpc/server, @trpc/client, etc. |
| **Complexity** | Lower | Higher (but better DX if already using) |
| **File Count** | More files (routes + hooks) | Fewer files (just router) |
| **Best For** | Standard Next.js apps | T3 Stack, existing tRPC projects |

---

## Next Steps

### Updating Terms to v2.0.0

When you need to update terms:

1. Create `legal/terms-of-service-v2.md`
2. Create seed script:

```typescript
// prisma/seed-terms-v2.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seedTermsV2() {
  // Set old version to not current
  await prisma.terms.updateMany({
    where: { isCurrent: true },
    data: { isCurrent: false },
  });

  // Read new terms
  const termsPath = path.join(process.cwd(), 'legal', 'terms-of-service-v2.md');
  const termsContent = fs.readFileSync(termsPath, 'utf-8');

  // Create new version
  await prisma.terms.create({
    data: {
      version: '2.0.0',
      content: termsContent,
      effectiveDate: new Date(),
      isCurrent: true,
    },
  });

  console.log('✅ Seeded Terms v2.0.0');
}

seedTermsV2()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

3. Run: `npx tsx prisma/seed-terms-v2.ts`
4. All users will see the modal again for v2.0.0

### Admin Dashboard (Optional)

Build when you need analytics:

```typescript
// Example: Get acceptance rate
const currentTerms = await db.terms.findFirst({ where: { isCurrent: true } });
const totalUsers = await db.user.count();
const acceptances = await db.userTermsAcceptance.count({
  where: { termsId: currentTerms.id }
});
const acceptanceRate = (acceptances / totalUsers) * 100;
```

---

## Compliance Notes

**This implementation provides:**
- ✅ Clear presentation of terms
- ✅ Affirmative action required
- ✅ Audit trail
- ✅ Version tracking

**You may also need:**
- Legal review of terms content
- Privacy Policy (separate document)
- Cookie consent (separate feature)
- GDPR compliance tools
- Age verification (if required)

**Not legal advice.** Consult a lawyer for your jurisdiction.

---

**Last Updated:** 2025-11-30
**Version:** 2.0.0 (Added API Routes approach)
