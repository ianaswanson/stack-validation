# Terms of Service Implementation Guide

This guide walks through implementing a complete Terms of Service acceptance system using the provided templates.

## Overview

**What you get:**
- Per-user terms acceptance tracking
- Version management for terms updates
- Scroll-to-accept UX pattern
- Explicit checkbox acknowledgment
- Full audit trail (IP address, timestamp)
- tRPC API with type safety
- React components with loading/error states

**Stack Requirements:**
- Next.js 14+ (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- tRPC + Zod
- Tailwind CSS

---

## Step 1: Database Schema

### Add Terms Models to Prisma Schema

Copy the Terms and UserTermsAcceptance models from `templates/prisma/schema-with-terms.prisma` into your existing `prisma/schema.prisma`.

You'll add these two models:

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

**Also update your User model** to include the relation:

```prisma
model User {
  // ... existing fields
  termsAcceptances UserTermsAcceptance[]
}
```

### Run Migration

```bash
npx prisma migrate dev --name add_terms_of_service
```

---

## Step 2: Create Terms Content

### Copy Legal Directory

```bash
cp -r templates/legal ./
```

### Customize Your Terms

Edit `legal/terms-of-service-v1.md` and replace placeholders:

- `[EFFECTIVE_DATE]` - Today's date or launch date
- `[PRODUCT_NAME]` - Your product name
- `[COMPANY_NAME]` - Your company name
- `[CONTACT_EMAIL]` - Support email
- `[COMPANY_ADDRESS]` - Physical address (if required)
- `[JURISDICTION]` - Legal jurisdiction (e.g., "California, United States")
- `[ARBITRATION_BODY]` - Arbitration body name (e.g., "American Arbitration Association")
- `[LOCATION]` - Arbitration location (e.g., "San Francisco, CA")

**Important:** Have your legal team review before going live.

---

## Step 3: Seed Database with Initial Terms

### Copy Seed Script

```bash
cp templates/prisma/seed-terms.ts prisma/
```

### Update package.json

Add the seed script to your `package.json`:

```json
{
  "scripts": {
    "db:seed:terms": "tsx prisma/seed-terms.ts"
  }
}
```

### Run Seed

```bash
npm run db:seed:terms
```

You should see: `✅ Seeded Terms v1.0.0`

---

## Step 4: Install Dependencies

```bash
npm install react-markdown
# or
pnpm add react-markdown
# or
yarn add react-markdown
```

---

## Step 5: Add tRPC Router

### Copy Router File

```bash
cp templates/server/api/routers/terms.ts src/server/api/routers/
```

### Register Router

In your `src/server/api/root.ts`:

```typescript
import { termsRouter } from "./routers/terms";

export const appRouter = createTRPCRouter({
  // ... existing routers
  terms: termsRouter,
});
```

---

## Step 6: Add Helper Functions

```bash
cp templates/lib/terms.ts src/lib/
```

These helpers provide server-side utilities for checking terms acceptance status.

---

## Step 7: Add React Components

### Copy Components

```bash
cp -r templates/components/terms src/components/
```

This gives you three components:
1. **TermsDisplay.tsx** - Renders markdown content with styling
2. **TermsModal.tsx** - Modal UI with scroll detection and acceptance
3. **TermsGate.tsx** - Wrapper that enforces terms acceptance

---

## Step 8: Integrate into Your App

You have two integration options:

### Option A: Client-Side Gate (Recommended)

Wrap your protected layout or pages with `<TermsGate>`:

**Example: `src/app/dashboard/layout.tsx`**

```typescript
import { TermsGate } from "~/components/terms/TermsGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TermsGate>
      {children}
    </TermsGate>
  );
}
```

### Option B: Server-Side Redirect

Use server components to check and redirect:

**Example: `src/app/dashboard/page.tsx`**

```typescript
import { getServerAuthSession } from "~/server/auth";
import { checkUserNeedsToAcceptTerms } from "~/lib/terms";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const needsAcceptance = await checkUserNeedsToAcceptTerms(session.user.id);

  if (needsAcceptance) {
    redirect("/accept-terms");
  }

  return <div>Dashboard content...</div>;
}
```

Then create `src/app/accept-terms/page.tsx` using the TermsGate pattern.

---

## Step 9: Test the Flow

### Create a Test User

1. Clear your session: Sign out
2. Sign in with a new Google account
3. You should see the terms modal immediately

### Test the UX

**Scroll Detection:**
- Terms modal should appear
- "Accept Terms" button should be disabled
- Scroll to bottom
- Notice the amber warning disappears
- Checkbox becomes enabled

**Checkbox Acknowledgment:**
- Check the "I have read and agree" checkbox
- "Accept Terms" button becomes enabled (blue)

**Acceptance:**
- Click "Accept Terms"
- Button shows loading spinner
- Modal closes and you're redirected to the app

**Persistence:**
- Sign out and sign back in
- Modal should NOT appear again (already accepted)

### Verify Database

```bash
npx prisma studio
```

Check:
- `Terms` table has one record with `isCurrent = true`
- `UserTermsAcceptance` table has a record for your user
- `ipAddress` field is populated

---

## Step 10: Styling Customization (Optional)

All components use Tailwind classes. Customize as needed:

**TermsModal.tsx:**
- Modal max width: `max-w-3xl` (line 74)
- Colors: Search and replace `blue-600` with your brand color
- Border radius: `rounded-lg` throughout

**TermsDisplay.tsx:**
- Typography: Prose classes (lines 23-24)
- Version info box: Lines 16-22

**TermsGate.tsx:**
- Loading spinner: Lines 22-29
- Error state: Lines 36-62

---

## Future: Updating Terms (v2.0.0)

When you need to update terms:

### 1. Create New Version File

```bash
cp legal/terms-of-service-v1.md legal/terms-of-service-v2.md
```

Edit `v2.md`:
- Update version to `2.0.0`
- Update effective date
- Make your changes

### 2. Seed New Version

Create `prisma/seed-terms-v2.ts`:

```typescript
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

### 3. Run the Migration

```bash
npx tsx prisma/seed-terms-v2.ts
```

### 4. What Happens Next

- All users who accepted v1.0.0 will see the modal again
- The `userId_termsId` unique constraint ensures users accept each version once
- Old acceptances are preserved in the database (audit trail)

---

## Admin Features (Build When Needed)

Ideas for future admin dashboard:

### Acceptance Analytics

```typescript
// Get acceptance rate for current terms
const currentTerms = await db.terms.findFirst({ where: { isCurrent: true } });
const totalUsers = await db.user.count();
const acceptances = await db.userTermsAcceptance.count({
  where: { termsId: currentTerms.id }
});
const acceptanceRate = (acceptances / totalUsers) * 100;
```

### User History View

```typescript
// In tRPC router (already included in templates/server/api/routers/terms.ts)
getUserAcceptances: protectedProcedure.query(async ({ ctx }) => {
  return await ctx.db.userTermsAcceptance.findMany({
    where: { userId: ctx.session.user.id },
    include: { terms: true },
    orderBy: { acceptedAt: 'desc' },
  });
});
```

### Export Acceptances for Compliance

```typescript
// Generate CSV of all acceptances
const acceptances = await db.userTermsAcceptance.findMany({
  include: {
    user: { select: { email: true } },
    terms: { select: { version: true } },
  },
});
```

---

## Troubleshooting

### "No current terms found" error

**Cause:** No terms in database with `isCurrent = true`

**Fix:**
```bash
npm run db:seed:terms
```

### Terms modal doesn't appear

**Cause:** User already accepted terms

**Fix (for testing):**
```sql
DELETE FROM "UserTermsAcceptance" WHERE "userId" = 'your-user-id';
```

Or sign in with a different account.

### Scroll detection doesn't work

**Cause:** Content is shorter than viewport

**Fix:** This is handled automatically. If content fits without scrolling, `hasScrolledToBottom` is set to `true` on mount (see `TermsModal.tsx` line 48).

### IP address shows "unknown"

**Cause:** Running locally without reverse proxy

**Fix:** In production on Vercel, `x-forwarded-for` header is automatically set. Locally, this is expected.

---

## File Structure Summary

After implementation, you should have:

```
/legal/
  terms-of-service-v1.md

/prisma/
  schema.prisma (with Terms models)
  seed-terms.ts

/src/server/api/routers/
  terms.ts

/src/lib/
  terms.ts

/src/components/terms/
  TermsDisplay.tsx
  TermsModal.tsx
  TermsGate.tsx

/src/app/dashboard/
  layout.tsx (with <TermsGate> wrapper)
```

---

## Key Design Decisions

### Why Scroll Detection?

Ensures users actually see the terms content, not just click "Accept" blindly.

### Why Checkbox Acknowledgment?

Adds explicit confirmation step. Legally stronger than just a button click.

### Why Store IP Address?

Creates audit trail for compliance. Optional field, can be removed if not needed.

### Why `isCurrent` Boolean Instead of Timestamp?

Simpler queries: `WHERE isCurrent = true` vs comparing dates. Only one version is current at a time.

### Why Unique Constraint on (userId, termsId)?

Prevents duplicate acceptances. User accepts each version exactly once.

---

## Compliance Considerations

**This implementation provides:**
- ✅ Clear presentation of terms
- ✅ Affirmative action required (checkbox + button)
- ✅ Audit trail (timestamp, IP, version)
- ✅ Version tracking for updates
- ✅ User cannot access app without acceptance

**Additional steps you might need:**
- Legal review of terms content
- Privacy Policy (separate document)
- Cookie consent (separate feature)
- GDPR compliance (data export, deletion)
- Age verification (if required)

**Not legal advice.** Consult a lawyer for your specific jurisdiction and industry.

---

## Support

For questions or issues with this implementation:

1. Check the troubleshooting section above
2. Review the template source code comments
3. Test with `npx prisma studio` to inspect database state
4. Check browser console for tRPC errors

---

**Last Updated:** 2025-11-30
**Template Version:** 1.0.0
