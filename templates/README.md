# Full-Stack Application Templates

This directory contains reusable templates for full-stack Next.js applications with authentication and terms of service.

## What's Included

### Authentication Templates
- **auth/login-page.tsx** - Landing page with Google sign-in
- **auth/dashboard-page.tsx** - Protected dashboard page
- **auth/session-provider.tsx** - NextAuth session provider wrapper

### UI Components
- **components/google-logo.tsx** - Google logo SVG component
- **components/placeholder-card.tsx** - Dashboard placeholder cards
- **components/user-menu.tsx** - User menu with sign out

### Terms of Service (Complete System)
- **components/terms/** - Full terms acceptance UI
  - `TermsDisplay.tsx` - Markdown renderer with version info
  - `TermsModal.tsx` - Modal with scroll detection and acceptance
  - `TermsGate.tsx` - Wrapper component that enforces acceptance
- **prisma/schema-with-terms.prisma** - Database schema with Terms models
- **prisma/seed-terms.ts** - Seed script for initial terms
- **server/api/routers/terms.ts** - tRPC router for terms operations
- **lib/terms.ts** - Server-side helper functions
- **legal/terms-of-service-v1.md** - Template terms content

### Documentation
- **TERMS-IMPLEMENTATION-GUIDE.md** - Complete implementation guide
- **DEPENDENCIES.md** - Required packages and installation

## Quick Start: New Project

### 1. Copy Templates

```bash
# Copy auth templates
cp templates/auth/* src/app/

# Copy components
cp -r templates/components src/

# Copy terms system
cp -r templates/components/terms src/components/
cp templates/server/api/routers/terms.ts src/server/api/routers/
cp templates/lib/terms.ts src/lib/
cp -r templates/legal ./
cp templates/prisma/seed-terms.ts prisma/
```

### 2. Update Prisma Schema

Copy the Terms and UserTermsAcceptance models from `templates/prisma/schema-with-terms.prisma` into your `prisma/schema.prisma`.

### 3. Install Dependencies

```bash
npm install react-markdown
npm install -D tsx
```

### 4. Customize Terms Content

Edit `legal/terms-of-service-v1.md` and replace all placeholders:
- `[PRODUCT_NAME]`
- `[COMPANY_NAME]`
- `[CONTACT_EMAIL]`
- etc.

### 5. Run Migrations & Seeds

```bash
npx prisma migrate dev --name add_terms
npm run db:seed:terms
```

### 6. Wrap Your App

In your dashboard layout:

```typescript
import { TermsGate } from "~/components/terms/TermsGate";

export default function DashboardLayout({ children }) {
  return <TermsGate>{children}</TermsGate>;
}
```

## Detailed Setup

For complete step-by-step instructions with **both API Routes and tRPC approaches**, see:

**[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** ← **Use This Guide**

Legacy guide (tRPC only): [TERMS-IMPLEMENTATION-GUIDE.md](./TERMS-IMPLEMENTATION-GUIDE.md)

## Template Architecture

### Design Patterns

**Terms System:**
- Per-user acceptance tracking
- Version management for updates
- Scroll-to-accept UX pattern
- Explicit checkbox acknowledgment
- Full audit trail (IP, timestamp)

**Authentication:**
- NextAuth with Google OAuth
- Session-based authentication
- Protected routes

**Tech Stack:**
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Prisma + PostgreSQL
- tRPC + Zod
- Tailwind CSS

### File Naming Conventions

- Page components: `page.tsx` or descriptive names (`login-page.tsx`)
- Client components: `'use client'` directive at top
- Server utilities: In `lib/` or `server/` directories
- Database operations: Via tRPC routers, not direct Prisma calls from client

## Customization

All templates use Tailwind CSS for styling. Key customization points:

**Colors:**
- Primary: `blue-600` (search and replace with your brand color)
- Hover states: `blue-700`
- Text: `gray-700`, `gray-600`, `gray-500`

**Spacing:**
- Consistent use of Tailwind spacing scale
- Modal padding: `px-6 py-4`
- Component gaps: `gap-4`, `gap-6`

**Typography:**
- Headings: `font-bold`, `font-semibold`
- Body text: Default font weight
- Code/mono: Uses browser defaults

## Integration Checklist

When adding these templates to an existing project:

- [ ] Copy required template files
- [ ] Update Prisma schema with Terms models
- [ ] Update User model to include `termsAcceptances` relation
- [ ] Install dependencies (`react-markdown`, `tsx`)
- [ ] Customize legal/terms-of-service-v1.md
- [ ] Run Prisma migration
- [ ] Seed terms into database
- [ ] Add terms router to tRPC root
- [ ] Wrap protected routes with `<TermsGate>`
- [ ] Test sign-in flow with new user
- [ ] Verify terms acceptance in database

## Testing

**Manual Testing:**
1. Clear session and sign in with new account
2. Terms modal should appear
3. Try accepting without scrolling → button disabled
4. Scroll to bottom → checkbox enables
5. Check checkbox → accept button enables
6. Click accept → modal closes, redirected to app
7. Sign out and back in → modal should NOT appear

**Database Verification:**
```bash
npx prisma studio
```
- Check Terms table has record with `isCurrent = true`
- Check UserTermsAcceptance table has your acceptance record

## Updating Terms (Future)

When you need to release v2.0.0 of your terms:

1. Create `legal/terms-of-service-v2.md`
2. Update version to `2.0.0` in the file
3. Create seed script for v2 (see implementation guide)
4. Run seed to insert new version and mark old as not current
5. All users will see modal again on next login

See **TERMS-IMPLEMENTATION-GUIDE.md** section "Future: Updating Terms" for details.

## Support

**Common Issues:**

- "No current terms found" → Run seed script
- Terms modal doesn't appear → User already accepted (delete acceptance record to test)
- IP address shows "unknown" → Expected locally, works in production
- Scroll detection doesn't work → Handled automatically for short content

**For Questions:**

1. Check implementation guide
2. Review template source code comments
3. Inspect database with Prisma Studio
4. Check browser console for errors

## License

These templates are part of the Claudian stack-validation utility and are provided as-is for use in your projects.

---

**Last Updated:** 2025-11-30
**Template Version:** 1.0.0
