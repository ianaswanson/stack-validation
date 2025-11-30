# Validated Full-Stack Workflow

**Status**: ✅ Validated on 2025-11-21
**Stack**: Next.js 14 + NextAuth + Prisma + Neon + Vercel

This document captures the validated workflow and all friction points discovered during the stack validation PoC.

---

## Prerequisites

### Tools Required
- Node.js 18+
- Docker Desktop (for local database)
- `gh` CLI (GitHub)
- `vercel` CLI
- `neonctl` CLI

### Accounts Needed
- Google Cloud Platform (for OAuth)
- Neon (database hosting)
- Vercel (application hosting)
- GitHub (code repository)

---

## Critical Learnings

### ❌ Issues We Hit (And Solutions)

#### 1. Prisma 7 Breaking Changes
**Problem**: Prisma 7 (just released) has config format changes that break builds.
**Solution**: Use Prisma 5 (stable) until Prisma 7 is widely adopted.

```bash
npm install prisma@5 @prisma/client@5
```

#### 2. Environment Variable Trailing Newlines
**Problem**: Using `echo` to pipe env vars adds `\n` characters that break Google OAuth.
**Solution**: **ALWAYS use `printf` instead of `echo`** for environment variables.

```bash
# ❌ WRONG - adds newline
echo "value" | vercel env add KEY environment

# ✅ CORRECT - no newline
printf 'value' | vercel env add KEY environment
```

#### 3. Port Conflicts (Local Postgres)
**Problem**: Homebrew Postgres running on port 5432 conflicts with Docker.
**Solution**: Stop local Postgres before using Docker, or use different port.

```bash
brew services stop postgresql@15
```

#### 4. Vercel Prisma Build Failure
**Problem**: Vercel caches dependencies, Prisma Client isn't generated.
**Solution**: Add `postinstall` script to `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### 5. Preview URL Instability
**Problem**: Preview URLs change on every deploy, breaking OAuth redirect URIs.
**Solution**: Use Git-connected deployment for stable branch URLs.

---

## Step-by-Step Workflow

### Phase 1: Local Development Setup

#### 1.1 Create Next.js Project
```bash
npx create-next-app@latest my-app --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
cd my-app
```

#### 1.2 Install Dependencies
```bash
npm install next-auth@latest @prisma/client@5 @auth/prisma-adapter
npm install -D prisma@5
```

#### 1.3 Add Prisma Postinstall Script
Edit `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### 1.4 Set Up Local Database (Docker)
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: my-app-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: my_app_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start database:
```bash
docker compose up -d
```

#### 1.5 Initialize Prisma
```bash
npx prisma init
```

Create schema in `prisma/schema.prisma` with:
- NextAuth models (Account, Session, User, VerificationToken)
- Your app models

Push schema to local database:
```bash
npx prisma db push
```

#### 1.6 Configure NextAuth
Create `lib/auth.ts` with NextAuth configuration.
Create `app/api/auth/[...nextauth]/route.ts` for API route.

#### 1.7 Set Up Google OAuth (Local)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret

Create `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/my_app_dev"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

#### 1.8 Test Local Development
```bash
npm run dev
```

Visit `http://localhost:3000` and test Google sign-in.

---

### Phase 2: Production Infrastructure

#### 2.1 Create Neon Project
```bash
neonctl projects create --name "My App" --org-id <your-org-id>
```

This creates a `main` branch (use for production).

#### 2.2 Create Staging Branch
```bash
neonctl branches create --project-id <project-id> --name staging
```

#### 2.3 Get Connection Strings
```bash
# Staging
neonctl connection-string --project-id <project-id> --branch-id <staging-branch-id>

# Production
neonctl connection-string --project-id <project-id> --branch-id <main-branch-id>
```

#### 2.4 Push Schema to Neon
```bash
# Staging
DATABASE_URL="<staging-connection-string>" npx prisma db push

# Production
DATABASE_URL="<production-connection-string>" npx prisma db push
```

---

### Phase 3: Git & Deployment Setup

#### 3.1 Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create my-app --public --source=. --remote=origin --push
```

#### 3.2 Create Staging Branch
```bash
git checkout -b staging
git push -u origin staging
git checkout main
```

#### 3.3 GitHub Branching Strategy
**Branch Structure**:
- `main` → Production (protected, requires PR)
- `staging` → Staging environment (protected, requires PR)
- `feature/*` → Feature development branches

**Workflow**:
1. Create feature branch from `staging`
2. Develop and test locally
3. Open PR to merge `feature/*` → `staging`
4. Test on staging deployment
5. Open PR to merge `staging` → `main`
6. Deploy to production

**Environment Mapping**:
```
Git Branch       → Vercel Env    → Neon Database     → URL
───────────────────────────────────────────────────────────────────────
feature/*        → local only    → Docker Postgres   → localhost:3000
staging          → preview        → staging branch    → *-git-staging-*.vercel.app
main             → production     → main branch       → *.vercel.app
```

#### 3.4 Set Up Branch Protection (Optional but Recommended)
Protect `main` and `staging` branches to enforce PR workflow:

**Via GitHub CLI**:
```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection -X PUT -f required_pull_request_reviews[required_approving_review_count]=1 -f enforce_admins=false

# Protect staging branch
gh api repos/:owner/:repo/branches/staging/protection -X PUT -f required_pull_request_reviews[required_approving_review_count]=1 -f enforce_admins=false
```

**Or via GitHub Web UI**:
1. Go to repo Settings → Branches → Add rule
2. Branch name pattern: `main` (and repeat for `staging`)
3. Check: "Require a pull request before merging"
4. Save changes

#### 3.5 Connect Vercel to GitHub
**Via Vercel Dashboard**:
1. Go to Vercel → New Project
2. Import from GitHub → Select your repo
3. Production Branch: `main`
4. Deploy

**Result**: Stable URLs per branch:
- `main` branch → `my-app.vercel.app`
- `staging` branch → `my-app-git-staging-<scope>.vercel.app`

---

### Phase 4: Environment Variables

#### 4.1 Add Environment Variables to Vercel
**CRITICAL**: Use `printf` (not `echo`) to avoid trailing newlines!

```bash
# Database URLs
printf '<staging-db-url>' | vercel env add DATABASE_URL preview
printf '<production-db-url>' | vercel env add DATABASE_URL production

# NextAuth Secret (same across environments)
printf '<your-secret>' | vercel env add NEXTAUTH_SECRET preview production

# NextAuth URLs (different per environment)
printf 'https://my-app-git-staging-<scope>.vercel.app' | vercel env add NEXTAUTH_URL preview
printf 'https://my-app.vercel.app' | vercel env add NEXTAUTH_URL production

# Google OAuth (same across environments)
printf '<client-id>' | vercel env add GOOGLE_CLIENT_ID preview production
printf '<client-secret>' | vercel env add GOOGLE_CLIENT_SECRET preview production
```

#### 4.2 Update Google OAuth Redirect URIs
Add to Google Cloud Console:
```
https://my-app-git-staging-<scope>.vercel.app/api/auth/callback/google
https://my-app.vercel.app/api/auth/callback/google
```

---

### Phase 5: Deployment & Testing

#### 5.1 Deploy Staging
Push to `staging` branch → Vercel auto-deploys to stable staging URL.

```bash
git checkout staging
# Make changes
git commit -m "Feature X"
git push
```

Test at: `https://my-app-git-staging-<scope>.vercel.app`

#### 5.2 Deploy Production
Merge `staging` → `main`:

```bash
git checkout main
git merge staging
git push
```

Test at: `https://my-app.vercel.app`

---

### Phase 6: Development Workflow (Feature Branches)

#### 6.1 Starting a New Feature
```bash
# Start from staging branch
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/add-user-profile
```

#### 6.2 Develop Locally
```bash
# Ensure Docker database is running
docker compose up -d

# Work on your feature
# ... make changes ...

# Test locally
npm run dev  # Test at localhost:3000

# Commit your changes
git add .
git commit -m "Add user profile page with avatar upload"
```

#### 6.3 Deploy to Staging
```bash
# Push feature branch and create PR to staging
git push -u origin feature/add-user-profile

# Create PR via gh CLI
gh pr create --base staging --title "Add user profile feature" --body "
## Changes
- Added user profile page
- Implemented avatar upload
- Added profile editing form

## Testing
- [ ] Tested locally with Docker database
- [ ] Ready for staging review
"

# After PR is approved and merged to staging:
# Vercel automatically deploys to staging URL
# Test at: https://my-app-git-staging-<scope>.vercel.app
```

#### 6.4 Deploy to Production
```bash
# After staging testing is complete, merge to main
git checkout staging
git pull origin staging

# Create PR from staging to main
gh pr create --base main --head staging --title "Release: User profile feature" --body "
## Features
- User profile page with avatar upload

## Validation
- [x] Tested in staging environment
- [x] Database migrations verified
- [x] OAuth flow tested
"

# After PR is approved and merged to main:
# Vercel automatically deploys to production URL
# Test at: https://my-app.vercel.app
```

#### 6.5 Cleanup
```bash
# Delete feature branch after merge
git branch -d feature/add-user-profile
git push origin --delete feature/add-user-profile
```

---

## Environment Comparison

| Environment | Git Branch | Database | Deploy Trigger | URL |
|-------------|------------|----------|----------------|-----|
| Local Dev | `feature/*` | Docker Postgres | `npm run dev` | `localhost:3000` |
| Staging | `staging` | Neon (staging branch) | Merge to `staging` via PR | `my-app-git-staging-*.vercel.app` (stable) |
| Production | `main` | Neon (main branch) | Merge to `main` via PR | `my-app.vercel.app` (stable) |

**Promotion Flow**:
```
feature/my-feature (local)
    → PR → staging (auto-deploy to staging URL)
    → PR → main (auto-deploy to production URL)
```

---

## Git Workflow FAQs

### Q: What if I need to work on multiple features at once?
Create separate feature branches from `staging`:
```bash
git checkout staging
git checkout -b feature/feature-a
# Work on feature A...

git checkout staging
git checkout -b feature/feature-b
# Work on feature B...
```

Each can be merged to staging independently via PRs.

### Q: What if staging has changes I need in my feature branch?
Rebase your feature branch on latest staging:
```bash
git checkout staging
git pull origin staging
git checkout feature/my-feature
git rebase staging
```

### Q: Can I test my feature branch on Vercel without merging to staging?
Yes, but it won't have a stable URL. Push your feature branch and Vercel will create a preview deployment with a random URL. For testing with OAuth, you'll need to add that random URL to Google OAuth (not recommended - use staging instead).

### Q: What if I need to hotfix production?
Create a hotfix branch from `main`, fix the issue, then merge to both `main` AND `staging`:
```bash
git checkout main
git checkout -b hotfix/critical-bug
# Fix the bug...
git push -u origin hotfix/critical-bug

# Create PR to main (urgent)
gh pr create --base main --title "Hotfix: Critical bug"

# After merge to main, also merge to staging to keep them in sync
git checkout staging
git merge main
git push origin staging
```

---

## Common Pitfalls

### 1. Environment Variables Not Working
**Symptom**: OAuth 401 errors or database connection failures.
**Debug**:
```bash
vercel env pull .env.check --environment preview
cat .env.check  # Look for trailing \n or escaped characters
```

**Fix**: Remove and re-add with `printf`.

### 2. Prisma Client Not Generated in Vercel
**Symptom**: Build fails with "Prisma Client not generated".
**Fix**: Add `"postinstall": "prisma generate"` to `package.json`.

### 3. Port 5432 Already in Use
**Symptom**: Docker can't start Postgres.
**Check**: `lsof -i :5432`
**Fix**: Stop Homebrew Postgres: `brew services stop postgresql@15`

### 4. Preview URLs Breaking OAuth
**Symptom**: OAuth works in production but not in preview.
**Cause**: Preview URLs change on each deploy.
**Fix**: Use Git-connected deployment for stable branch URLs.

---

## Template Environment Files

### `.env.example`
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
```

---

## Validation Checklist

- [ ] Local: Sign in with Google works
- [ ] Local: Create/read data from database
- [ ] Local: Data persists after refresh
- [ ] Staging: Deploy succeeds
- [ ] Staging: Google OAuth works (stable URL)
- [ ] Staging: Database connected (Neon staging)
- [ ] Staging: CRUD operations work
- [ ] Production: Deploy succeeds
- [ ] Production: Google OAuth works
- [ ] Production: Database connected (Neon production)
- [ ] Production: CRUD operations work
- [ ] Staging/Production: Data is isolated between environments

---

## Cost Breakdown (As of 2025-11-21)

| Service | Free Tier | Cost After Free Tier |
|---------|-----------|---------------------|
| Vercel | Unlimited hobby projects | $20/mo per member (Pro) |
| Neon | 10 branches, 3 GB storage | $19/mo (Scale) |
| Google OAuth | Unlimited | Free |
| Docker (local) | Free | Free |

**Total for hobby/validation**: $0/mo
**Total for production**: ~$39/mo

---

## Reference Implementation

This section contains the exact, validated code for all critical files. Copy-paste these to avoid interpretation errors and ensure you don't hit the issues we encountered.

### 1. `prisma/schema.prisma`

**Why this exact implementation matters**: Field types, relations, and adapter compatibility are critical. This schema is validated to work with NextAuth + Prisma Adapter.

```prisma
// CRITICAL: Use Prisma 5, not Prisma 7
// Issue #1: Prisma 7 has breaking config changes as of 2025-11-21
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// NextAuth.js Required Models
// ============================================
// These models MUST match the Prisma Adapter schema exactly
// Do not modify field names, types, or relations

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  notes         Note[]     // Your app-specific relations go here
  createdAt     DateTime  @default(now())
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================
// Your Application Models
// ============================================
// Add your app-specific models below

// Example: Simple Note model for testing CRUD operations
model Note {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. `docker-compose.yml`

**Why this exact implementation matters**: Port 5432 conflicts are common. This config ensures proper isolation and persistence.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    # IMPORTANT: Use a unique container name to avoid conflicts
    container_name: hello-world-postgres
    restart: unless-stopped
    ports:
      # Issue #3: Port 5432 conflicts with Homebrew Postgres
      # Stop Homebrew Postgres first: brew services stop postgresql@15
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      # Use a descriptive database name for your project
      POSTGRES_DB: hello_world_dev
    command: >
      postgres
      -c listen_addresses='*'
      -c password_encryption=md5
    volumes:
      # Named volume ensures data persists across container restarts
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. `package.json`

**Why this exact implementation matters**: The postinstall script is CRITICAL for Vercel deployments.

```json
{
  "name": "hello-world-full-stack",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    // Issue #4: Vercel caches dependencies, Prisma Client must be regenerated
    // This postinstall script is REQUIRED for successful Vercel deployments
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.1",
    // Issue #1: Use Prisma 5, not 7 (breaking changes in v7)
    "@prisma/client": "^5.22.0",
    "next": "16.0.3",
    "next-auth": "^4.24.13",
    "pg": "^8.16.3",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.3",
    // Issue #1: Use Prisma 5, not 7
    "prisma": "^5.22.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### 4. `lib/auth.ts`

**Why this exact implementation matters**: The adapter setup and type casting are specific to NextAuth + Prisma integration.

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Single Prisma instance for the auth module
const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  // IMPORTANT: Type casting 'as any' is required due to NextAuth/Prisma adapter type mismatch
  // This is a known issue and the recommended workaround
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    GoogleProvider({
      // These environment variables MUST be set in .env (local) and Vercel (production/preview)
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Add other providers here (GitHub, Email, etc.)
  ],

  callbacks: {
    // Add user.id to the session object so it's available in client components
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  pages: {
    // Redirect to home page for sign-in (customize as needed)
    signIn: "/",
  },
};
```

### 5. `app/api/auth/[...nextauth]/route.ts`

**Why this exact implementation matters**: This is the catch-all API route that handles all NextAuth requests.

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth handler for App Router (Next.js 13+)
// This route handles all auth-related requests:
// - /api/auth/signin
// - /api/auth/signout
// - /api/auth/callback/[provider]
// - /api/auth/session
const handler = NextAuth(authOptions);

// Export for both GET and POST methods (required by NextAuth)
export { handler as GET, handler as POST };
```

### 6. `app/providers.tsx`

**Why this exact implementation matters**: SessionProvider must wrap the app for useSession hook to work in client components.

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

// Client-side provider wrapper for NextAuth session management
// MUST be a client component (note "use client" directive)
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Usage in `app/layout.tsx`**:
```typescript
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 7. `.env.example`

**Why this exact template matters**: Shows all required variables with helpful comments and examples.

```env
# ===================================
# DATABASE
# ===================================
# Local (Docker): postgresql://postgres:postgres@localhost:5432/hello_world_dev
# Staging (Neon): See .env.staging
# Production (Neon): See .env.production
DATABASE_URL="postgresql://user:password@host:5432/database"

# ===================================
# NEXTAUTH
# ===================================
# Generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET="generate-a-secret-key"

# Local: http://localhost:3000
# Staging: https://your-staging-domain.vercel.app
# Production: https://your-production-domain.com
NEXTAUTH_URL="http://localhost:3000"

# ===================================
# GOOGLE OAUTH
# ===================================
# Get from Google Cloud Console
# https://console.cloud.google.com/apis/credentials
#
# Authorized redirect URIs must include:
# - http://localhost:3000/api/auth/callback/google (local)
# - https://your-staging-domain.vercel.app/api/auth/callback/google (staging)
# - https://your-production-domain.com/api/auth/callback/google (production)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Implementation Notes

**When following this reference implementation**:

1. **Copy-paste exactly** - Don't interpret or modify unless you understand the implications
2. **Comments reference issues** - Each "Issue #X" refers to the problems documented in "Critical Learnings" section
3. **File paths matter** - These files must be in exact locations specified
4. **Dependencies must match** - Pay attention to version numbers (especially Prisma 5)
5. **Environment variables** - Use `printf` (not `echo`) when adding to Vercel (see Issue #2)

**What you can safely customize**:
- Application models (like `Note`) in Prisma schema
- Additional OAuth providers in `lib/auth.ts`
- Custom callback logic in `authOptions.callbacks`
- UI/UX in pages and components
- Database and container names

**What you should NOT modify**:
- NextAuth models (Account, Session, User, VerificationToken)
- Prisma adapter setup
- The `postinstall` script
- NextAuth route handler structure

---

## Next Steps After Validation

1. **Add to Tier 1 Stack** (if validated): Update `docs/standards/tier-1-stack.md`
2. **Create Project Template**: Save this setup as a starter template
3. **Document Any New Issues**: Update this file with lessons learned
4. **Simplify**: Remove any unnecessary complexity found during validation

---

**Last Updated**: 2025-11-21
**Validated By**: Ian Swanson + Claude Code
**Reference PoC**: https://github.com/ianaswanson/stack-validation-poc
**Documentation Enhancements**: 2025-11-21 (Added GitHub workflow + Reference Implementation)
