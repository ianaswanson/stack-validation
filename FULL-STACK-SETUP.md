# Full-Stack Setup Instructions

**Purpose**: Executable instructions for Claude to create a full-stack Next.js app with Google OAuth across 3 environments.

**Goal**: User says "Create full-stack project called X with Google OAuth" → Claude follows these instructions → Working app in local, staging, production.

**Templates**: This setup uses reusable templates from `templates/`:
- `auth/login-page.tsx` - Clean, Mobbin-style login with Google OAuth
- `auth/dashboard-page.tsx` - Professional protected dashboard with sign-out in header
- `auth/session-provider.tsx` - NextAuth SessionProvider wrapper
- `components/google-logo.tsx` - Official Google brand logo
- All templates use Claudian design system tokens (no hardcoded values)

---

## Prerequisites Check

Before starting, verify:

```bash
# Check CLI authentication
vercel whoami     # Must show username
neonctl auth show # Must show email
gh auth status    # Must show logged in

# Check Docker running
docker ps         # Must work without errors

# Check local domain infrastructure
ping -c 1 test.test 2>/dev/null && echo "dnsmasq OK" || echo "dnsmasq NOT CONFIGURED"
brew services list | grep caddy | grep started && echo "Caddy OK" || echo "Caddy NOT RUNNING"
```

If any fail, stop and tell user which component is missing.

**Local domain infrastructure setup** (one-time per machine):
- dnsmasq: Routes `*.test` → `127.0.0.1` (see dotfiles setup)
- Caddy: Routes `project.test` → `localhost:PORT` (see dotfiles setup)

---

## Phase 1: Gather OAuth Credentials

**Input needed from user**: Path to Google OAuth credentials JSON file

**Check for existing file:**
```bash
ls ~/Downloads/client_secret_*.json
```

If found, use it. Otherwise ask user: "Where is your Google OAuth credentials JSON file?"

**Parse credentials:**
```bash
# Extract from JSON
GOOGLE_CLIENT_ID=$(jq -r '.web.client_id' < /path/to/credentials.json)
GOOGLE_CLIENT_SECRET=$(jq -r '.web.client_secret' < /path/to/credentials.json)
```

**Validation**: Both values must be non-empty strings. If empty, tell user the JSON format is incorrect.

---

## Slice 1: Local Environment

**Architecture Decision**: Local development uses **Docker PostgreSQL** (not Neon). This allows developers to work offline and iterate quickly without cloud database costs or latency.

- **Local**: Docker PostgreSQL (localhost:PORT)
- **Staging**: Neon branch (cloud database)
- **Production**: Neon main branch (cloud database)

### Step 1.1: Create Next.js Project

**Location**: `/path/to/parent-directory/PROJECT_NAME`

```bash
cd /path/to/parent-directory
npx create-next-app@latest PROJECT_NAME --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd PROJECT_NAME
```

**Expected**: Creates project directory with package.json

### Step 1.2: Install Dependencies

```bash
npm install next-auth@latest @auth/prisma-adapter@latest @prisma/client@^5.22.0 pg@latest
npm install -D prisma@^5.22.0
```

**Note**: We use Prisma 5.x (not 7.x) because Prisma 7 has breaking changes with datasource URL configuration that are incompatible with NextAuth.js setup.

**Add to package.json scripts:**
```json
{
  "postinstall": "prisma generate"
}
```

### Step 1.3: Assign Unique Ports

**Strategy**: Scan Caddy configs for used ports, skip reserved ports, assign next available.

**Reserved ports (do not auto-assign)**:
| Port | Reason |
|------|--------|
| 3000-3002 | Hotload / one-off Next.js projects |
| 4000 | Common API default |
| 5000-5002 | Python / Flask defaults |
| 8000, 8080, 8888 | Common defaults |

**Caddy config location**: `~/ai-dev/dotfiles/caddy/projects/*.caddy`

```bash
# Reserved web ports (space-separated)
RESERVED_PORTS="3000 3001 3002 4000 5000 5001 5002 8000 8080 8888"

# Get all ports currently used by Caddy configs
CADDY_DIR="$HOME/ai-dev/dotfiles/caddy/projects"
USED_PORTS=""
if [ -d "$CADDY_DIR" ]; then
  USED_PORTS=$(grep -h "reverse_proxy localhost:" "$CADDY_DIR"/*.caddy 2>/dev/null | \
    sed 's/.*localhost:\([0-9]*\).*/\1/' | sort -n | uniq | tr '\n' ' ')
fi

# Find next available web port starting at 3003
NEXTJS_PORT=""
for port in $(seq 3003 3099); do
  # Skip if reserved
  if echo "$RESERVED_PORTS" | grep -qw "$port"; then
    continue
  fi
  # Skip if already used by Caddy
  if echo "$USED_PORTS" | grep -qw "$port"; then
    continue
  fi
  # Skip if currently in use (process running)
  if lsof -i :$port > /dev/null 2>&1; then
    continue
  fi
  NEXTJS_PORT=$port
  break
done

# Find available database port (5430-5499 range)
DB_PORT=""
for port in $(seq 5430 5499); do
  if ! lsof -i :$port > /dev/null 2>&1; then
    DB_PORT=$port
    break
  fi
done

echo "Assigned ports: Web=$NEXTJS_PORT, DB=$DB_PORT"
```

**Expected**: NEXTJS_PORT (e.g., 3003) and DB_PORT (e.g., 5430) are set

### Step 1.4: Create Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: PROJECT_NAME-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: PROJECT_NAME_dev
    ports:
      - "DB_PORT:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Replace**: PROJECT_NAME and DB_PORT with actual values

### Step 1.5: Start Database

```bash
docker compose up -d
```

**Wait for ready:**
```bash
timeout=30
elapsed=0
until docker exec PROJECT_NAME-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
  elapsed=$((elapsed + 1))
  if [ $elapsed -ge $timeout ]; then
    echo "ERROR: Database did not become ready in ${timeout}s"
    exit 1
  fi
done
```

**Expected**: Container running and accepting connections

### Step 1.6: Create Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

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
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Step 1.7: Generate NEXTAUTH_SECRET

```bash
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

**Expected**: 44-character base64 string

### Step 1.8: Create .env File

**File**: `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:DB_PORT/PROJECT_NAME_dev"
NEXTAUTH_SECRET="NEXTAUTH_SECRET_VALUE"
NEXTAUTH_URL="http://localhost:NEXTJS_PORT"
GOOGLE_CLIENT_ID="CLIENT_ID_VALUE"
GOOGLE_CLIENT_SECRET="CLIENT_SECRET_VALUE"
```

**Replace**: All placeholder values with actual values

**Note**: `NEXTAUTH_URL` must use `localhost` (not `.test`) because Google OAuth requires public TLDs for redirect URIs.

### Step 1.9: Push Schema to Database

```bash
npx prisma db push
```

**Expected**: Success message "Your database is now in sync with your Prisma schema"

**If fails with connection error**: Check Docker container is running

### Step 1.10: Create NextAuth Configuration

**File**: `lib/auth.ts`

This configuration includes a **Mock Provider** for dev/preview environments. This solves the problem that Google OAuth requires static redirect URIs - preview deployments have dynamic URLs that can't be allowlisted.

- **Production & Staging**: Real Google OAuth only
- **Local & Preview**: Mock provider for instant login + Google for integration testing

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Detect if we are in a "Mock-Safe" environment
const useMockProvider =
  process.env.VERCEL_ENV === "preview" ||
  process.env.NODE_ENV === "development";

// Build providers array
const providers: NextAuthOptions["providers"] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
];

// Inject Mock Provider for dev/preview environments
if (useMockProvider) {
  providers.push(
    CredentialsProvider({
      id: "mock-login",
      name: "Mock Login",
      credentials: {},
      async authorize() {
        // Return a mock user for instant dev/preview login
        return {
          id: "mock-user-preview",
          name: "Preview Developer",
          email: "dev@preview.local",
          image: "https://api.dicebear.com/7.x/avataaars/svg?seed=preview",
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  // Use database adapter for real OAuth, JWT for mock
  adapter: PrismaAdapter(prisma) as any,
  // Use JWT strategy when mock provider is available (supports both flows)
  session: {
    strategy: useMockProvider ? "jwt" : "database",
  },
  providers,
  pages: {
    signIn: "/",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      // Persist user id in JWT token
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token, user }) => {
      // Handle both JWT (mock) and database (OAuth) sessions
      if (token) {
        // JWT session (mock provider or dev mode)
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string,
          },
        };
      }
      // Database session (production OAuth)
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },
};
```

**File**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### Step 1.11: Copy Google Logo Component from Template

**Source**: `templates/components/google-logo.tsx`
**Destination**: `components/google-logo.tsx`

```bash
mkdir -p components
cp templates/components/google-logo.tsx components/google-logo.tsx
```

### Step 1.12: Copy SessionProvider from Template

**Source**: `templates/auth/session-provider.tsx`
**Destination**: `components/session-provider.tsx`

```bash
cp templates/auth/session-provider.tsx components/session-provider.tsx
```

### Step 1.13: Update Root Layout

**File**: `app/layout.tsx`

Update to use the SessionProvider component:

```typescript
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

### Step 1.14: Copy Login Page from Template

**Source**: `templates/auth/login-page.tsx`
**Destination**: `app/page.tsx`

```bash
cp templates/auth/login-page.tsx app/page.tsx
```

**Then replace** `%%PROJECT_NAME%%` with actual project name:

```bash
sed -i '' "s/%%PROJECT_NAME%%/$PROJECT_NAME/g" app/page.tsx
```

**Features included**:
- Clean, Mobbin-style centered card layout
- Google OAuth integration with NextAuth
- Developer bypass mode (dev/preview only)
- Uses Claudian design system tokens
- Professional loading states and redirects

### Step 1.15: Copy Dashboard Page from Template

**Source**: `templates/auth/dashboard-page.tsx`
**Destination**: `app/dashboard/page.tsx`

```bash
mkdir -p app/dashboard
cp templates/auth/dashboard-page.tsx app/dashboard/page.tsx
```

**Then replace** `%%PROJECT_NAME%%` with actual project name:

```bash
sed -i '' "s/%%PROJECT_NAME%%/$PROJECT_NAME/g" app/dashboard/page.tsx
```

**Features included**:
- Session-protected route (redirects if unauthenticated)
- Professional header with user profile
- Loading state during auth check
- Sign out functionality
- Quick stats/cards layout
- Uses Claudian design system tokens

### Step 1.16: Install Tailwind Config with Design System

**Purpose**: Use Claudian design system tokens for consistent styling

**Strategy**: Copy the design system config directly into the project for independence (no monorepo dependency).

```bash
# Copy design system Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e',
        },
        secondary: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
          400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
          800: '#6b21a8', 900: '#581c87',
        },
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        neutral: {
          50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
          800: '#262626', 900: '#171717',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'h1': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'h3': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h5': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'button': ['0.875rem', { lineHeight: '1', fontWeight: '500' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
}
EOF
```

**Note**: This embeds the complete Claudian design system. Each project gets its own copy for independence from the monorepo.

### Step 1.17: Update package.json Dev Script

**Modify** `scripts.dev` in package.json:

```json
{
  "scripts": {
    "dev": "next dev --port NEXTJS_PORT"
  }
}
```

**Replace**: NEXTJS_PORT with actual port

### Step 1.18: Create Caddy Config for Local Domain

**Purpose**: Enable accessing the project via `PROJECT_NAME.test` instead of `localhost:PORT`

**File**: `~/ai-dev/dotfiles/caddy/projects/PROJECT_NAME.caddy`

```bash
CADDY_DIR="$HOME/ai-dev/dotfiles/caddy/projects"
mkdir -p "$CADDY_DIR"

cat > "$CADDY_DIR/PROJECT_NAME.caddy" <<EOF
http://PROJECT_NAME.test {
    reverse_proxy localhost:NEXTJS_PORT
}
EOF

# Reload Caddy to pick up new config
caddy reload --config /opt/homebrew/etc/Caddyfile
```

**Replace**: PROJECT_NAME and NEXTJS_PORT with actual values

**Expected**: Caddy reloads successfully. Project now accessible at `http://PROJECT_NAME.test`

**If Caddy reload fails**:
- Check syntax: `caddy validate --config /opt/homebrew/etc/Caddyfile`
- Check Caddy is running: `brew services list | grep caddy`

### Step 1.19: Start Dev Server

```bash
npm run dev &
DEV_PID=$!
```

**Wait for ready**: Poll http://localhost:NEXTJS_PORT until 200 response (max 30s)

---

### ⚠️ UAT GATE 1: Local OAuth Setup

**Stop and tell user:**

```
✅ Local environment ready!

Access via:
- http://PROJECT_NAME.test (daily development - use Developer Bypass)
- http://localhost:NEXTJS_PORT (for testing real Google OAuth)

📋 Manual Step Required:

Add this OAuth redirect URI to Google Cloud Console:
  http://localhost:NEXTJS_PORT/api/auth/callback/google

Steps:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", click "+ ADD URI"
4. Paste: http://localhost:NEXTJS_PORT/api/auth/callback/google
5. Click SAVE

Then visit http://localhost:NEXTJS_PORT and test sign-in with Google.

📝 Local Development Workflow:
- Daily dev: Use PROJECT_NAME.test + Developer Bypass (instant login)
- OAuth testing: Use localhost:NEXTJS_PORT + real Google sign-in

Note: Google OAuth requires public TLDs, so .test domains cannot be used
for OAuth redirect URIs. The bypass button solves this for daily dev.

Tell me: "local works" or describe any error you see.
```

**Wait for user response.**

**After user confirms OAuth works, verify full stack**:

1. **Frontend**: User should see dashboard with their name/email
2. **Backend/Database**: Check database records were created:

```bash
docker exec -it PROJECT_NAME-postgres psql -U postgres -d PROJECT_NAME_dev -c "SELECT id, email, name FROM \"User\" LIMIT 5;"
```

**Expected**: At least 1 user record from the sign-in

If records exist, tell user: "✅ Full stack verified - Auth, Frontend, and Database all working"

**If user reports error**:
- Check error message
- Common issues:
  - "redirect_uri_mismatch": URI not added or not saved in Google Console
  - "invalid_client": Check GOOGLE_CLIENT_ID in .env matches Google Console
  - Database connection error: Check Docker container is running
  - No database records: Check NextAuth API route is working (check dev server logs)

**Do not proceed to Slice 2 until user confirms "local works" AND database records verified**

---

## Slice 2: Production Environment

### Step 2.1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### Step 2.2: Create .gitignore

**File**: `.gitignore` (if not already created by create-next-app)

```
# dependencies
/node_modules

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/migrations
```

### Step 2.3: Create GitHub Repository

```bash
gh repo create PROJECT_NAME --public --source=. --remote=origin --push
```

**Expected**: Repository created and code pushed to main branch

**If fails**: Check `gh auth status` and user permissions

### Step 2.4: Create Neon Project

**Use Neon CLI** (MCP servers may not be configured):

```bash
yes | neonctl projects create --name PROJECT_NAME --region-id aws-us-west-2 --output json
```

**IMPORTANT**: Always use `--region-id aws-us-west-2` for consistency.

**Expected response**: JSON with `project.id`

**Save**: NEON_PROJECT_ID from response

### Step 2.5: Get Neon Default Branch

**Use Neon MCP**:

```javascript
mcp__Neon__list_projects({
  params: {
    search: "PROJECT_NAME"
  }
})
```

**Extract**: Default branch ID from project

**If multiple projects match**: Use most recently created

**Save**: NEON_MAIN_BRANCH_ID

### Step 2.6: Get Production Connection String

**Use Neon MCP**:

```javascript
mcp__Neon__get_connection_string({
  params: {
    projectId: NEON_PROJECT_ID
  }
})
```

**Expected**: PostgreSQL connection string

**Save**: PRODUCTION_DB_URL

### Step 2.7: Push Schema to Production Database

```bash
DATABASE_URL="PRODUCTION_DB_URL" npx prisma db push
```

**Expected**: Success message

**If fails with "database does not exist"**: Neon branch not ready, wait 10s and retry once

### Step 2.8: Deploy to Vercel

**Use Vercel MCP**:

```javascript
mcp__vercel__deploy_to_vercel({})
```

**Expected**: Deployment created, returns deployment URL

**Save**: DEPLOYMENT_URL from response

### Step 2.9: Get Deployment Aliases

**Use Vercel MCP**:

```javascript
mcp__vercel__get_deployment({
  idOrUrl: DEPLOYMENT_URL,
  teamId: VERCEL_TEAM_ID
})
```

**Extract**: `aliases` array from response

**Expected**: Array of 2-3 URLs like:
- `https://PROJECT_NAME.vercel.app`
- `https://PROJECT_NAME-TEAM.vercel.app`
- `https://PROJECT_NAME-UNIQUE-TEAM.vercel.app`

**Save**: PRODUCTION_ALIASES array

**If no aliases found**: Use DEPLOYMENT_URL as single alias

### Step 2.10: Set Production Environment Variables

For EACH of these variables, set on production environment:

```bash
printf '%s' "PRODUCTION_DB_URL" | vercel env add DATABASE_URL production
printf '%s' "NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production
printf '%s' "PRODUCTION_ALIASES[0]" | vercel env add NEXTAUTH_URL production
printf '%s' "GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production
printf '%s' "GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production
printf '%s' "production" | vercel env add NEXT_PUBLIC_VERCEL_ENV production
```

**Note**: Use `printf '%s'` not `echo` to avoid newline characters

**Note**: `NEXT_PUBLIC_VERCEL_ENV` controls whether the mock login button appears. Set to "production" so it's hidden on prod.

**Expected**: Each env var set successfully

### Step 2.11: Trigger Redeploy (to pick up env vars)

```bash
vercel --prod
```

**Expected**: New deployment with env vars

**Get new deployment URL and query aliases again** (repeat Step 2.9)

---

### ⚠️ UAT GATE 2: Production OAuth Setup

**Stop and tell user:**

```
✅ Production deployed. Found N deployment aliases.

📋 Manual Step Required:

Add these OAuth redirect URIs to Google Cloud Console:
  [URL_1]/api/auth/callback/google
  [URL_2]/api/auth/callback/google
  [URL_3]/api/auth/callback/google

(List ALL URLs from PRODUCTION_ALIASES)

Steps:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Add ALL [N] redirect URIs shown above
4. Click SAVE

Then test sign-in on EACH URL:
1. [URL_1]
2. [URL_2]
3. [URL_3]

Tell me which URLs work and which fail.
```

**Wait for user response.**

**After user confirms OAuth works on all URLs, verify full stack**:

1. **Frontend**: User should see dashboard with their name/email on each URL
2. **Backend/Database**: Check production database records were created:

```javascript
mcp__Neon__run_sql({
  params: {
    projectId: NEON_PROJECT_ID,
    branchId: PRODUCTION_BRANCH_ID,
    sql: "SELECT id, email, name FROM \"User\" LIMIT 5;"
  }
})
```

**Expected**: At least 1 user record from the sign-in

If records exist, tell user: "✅ Production full stack verified - Auth (all 3 URLs), Frontend, and Database all working"

**If user reports some URLs fail**:
- Check which specific URLs failed
- Common issue: User didn't add all URLs or didn't click SAVE
- Have user double-check Google Console shows all URLs
- Note: Google OAuth changes take 5-10 minutes to propagate globally

**Do not proceed to Slice 3 until user confirms all production URLs work AND database records verified**

---

## Slice 3: Staging Environment

### Step 3.1: Create Staging Branch

```bash
git checkout -b staging
git push -u origin staging
git checkout main
```

**Expected**: Staging branch exists on GitHub

### Step 3.2: Create Neon Staging Branch

**Use Neon MCP**:

```javascript
mcp__Neon__create_branch({
  params: {
    projectId: NEON_PROJECT_ID,
    branchName: "staging"
  }
})
```

**Expected**: Branch created, returns branch ID

**Save**: NEON_STAGING_BRANCH_ID

**Important**: Wait 10 seconds after creation before using

```bash
sleep 10
```

### Step 3.3: Get Staging Connection String

**Use Neon MCP**:

```javascript
mcp__Neon__get_connection_string({
  params: {
    projectId: NEON_PROJECT_ID,
    branchId: NEON_STAGING_BRANCH_ID
  }
})
```

**Expected**: PostgreSQL connection string for staging

**Save**: STAGING_DB_URL

### Step 3.4: Push Schema to Staging Database

```bash
DATABASE_URL="STAGING_DB_URL" npx prisma db push
```

**Expected**: Success message

**If fails with "branch not ready"**: Wait another 10s and retry once

### Step 3.5: Deploy Staging Branch

Trigger a staging deployment by pushing to the staging branch:

```bash
git checkout staging
git commit --allow-empty -m "Trigger staging deploy"
git push origin staging
git checkout main
```

Wait for the preview deployment to complete:

```bash
# Wait ~30s, then check deployment status
vercel ls | head -5
```

**Expected**: A preview deployment URL like `PROJECT_NAME-XXXXX-team.vercel.app` with status "Ready"

**Save**: STAGING_DEPLOYMENT_URL (the preview deployment URL)

### Step 3.6: Add Vercel Custom Domain (Staging)

**Step 1**: Add the staging domain to the project:

```bash
vercel domains add PROJECT_NAME-staging.vercel.app
```

**Step 2**: Alias the staging deployment to the custom domain:

```bash
vercel alias set STAGING_DEPLOYMENT_URL PROJECT_NAME-staging.vercel.app
```

**Expected**: Success message confirming alias assignment

**Verify domain is active**:

```bash
curl -s -o /dev/null -w "%{http_code}" https://PROJECT_NAME-staging.vercel.app
```

**Expected**: 200

**Note**: This alias is manually assigned. For auto-updates on future staging deploys, configure the domain to link to the `staging` git branch in Vercel dashboard (Settings > Domains).

### Step 3.7: Set Staging Environment Variables

For EACH variable, set on preview environment:

```bash
printf '%s' "STAGING_DB_URL" | vercel env add DATABASE_URL preview
printf '%s' "NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET preview
printf '%s' "https://PROJECT_NAME-staging.vercel.app" | vercel env add NEXTAUTH_URL preview
printf '%s' "GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID preview
printf '%s' "GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET preview
printf '%s' "preview" | vercel env add NEXT_PUBLIC_VERCEL_ENV preview
```

**Note**: Staging uses "preview" environment in Vercel

**Note**: `NEXT_PUBLIC_VERCEL_ENV=preview` enables the mock login button on preview deployments, allowing instant login without OAuth configuration.

### Step 3.8: Redeploy Staging (to pick up env vars)

```bash
git checkout staging
git commit --allow-empty -m "Trigger redeploy with env vars"
git push origin staging
git checkout main
```

**Expected**: New staging deployment with env vars

---

### ⚠️ UAT GATE 3: Staging OAuth Setup

**Stop and tell user:**

```
✅ Staging deployed at https://PROJECT_NAME-staging.vercel.app

📋 Manual Step Required:

Add this OAuth redirect URI to Google Cloud Console:
  https://PROJECT_NAME-staging.vercel.app/api/auth/callback/google

Steps:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Add the redirect URI shown above
4. Click SAVE

Then test sign-in at https://PROJECT_NAME-staging.vercel.app

Tell me: "staging works" or describe any error.
```

**Wait for user response.**

**After user confirms OAuth works, verify full stack**:

1. **Frontend**: User should see dashboard with their name/email
2. **Backend/Database**: Check staging database records were created:

```javascript
mcp__Neon__run_sql({
  params: {
    projectId: NEON_PROJECT_ID,
    branchId: STAGING_BRANCH_ID,
    sql: "SELECT id, email, name FROM \"User\" LIMIT 5;"
  }
})
```

**Expected**: At least 1 user record from the sign-in

If records exist, tell user: "✅ Staging full stack verified - Auth, Frontend, and Database all working"

**If user reports error**:
- Check error message
- Common issues:
  - "redirect_uri_mismatch": URI not added or custom domain not active
  - Check custom domain is actually linked to staging branch in Vercel (not Production)
  - Verify environment variables are set on preview environment (not production)

**Do not mark complete until user confirms "staging works" AND database records verified**

---

## Completion

**When all 3 UAT gates pass**, tell user:

```
✅ All 3 environments validated and working!

You now have:
- Local: http://PROJECT_NAME.test (or http://localhost:NEXTJS_PORT)
- Staging: https://PROJECT_NAME-staging.vercel.app
- Production: https://PROJECT_NAME.vercel.app (+ N aliases)

All with Google OAuth authentication working.

Resources:
- GitHub: https://github.com/USER/PROJECT_NAME
- Neon: https://console.neon.tech/app/projects/NEON_PROJECT_ID
- Vercel: https://vercel.com/TEAM/PROJECT_NAME

Development workflow:
- Local: cd PROJECT_NAME && docker compose up -d && npm run dev
  Then visit http://PROJECT_NAME.test
- Deploy to staging: Create PR to staging branch
- Deploy to production: Create PR from staging to main
```

---

## Error Handling Reference

### Database Connection Errors

**Symptom**: `Can't reach database server`

**Causes**:
1. Docker container not running → `docker ps` to check
2. Wrong port in connection string → Verify DB_PORT matches docker-compose.yml
3. Neon branch not ready → Wait 10s and retry

### OAuth Errors

**Symptom**: `redirect_uri_mismatch`

**Cause**: Redirect URI not added to Google Console or typo in URI

**Fix**: Double-check exact URI in Google Console matches what was provided

**Symptom**: `invalid_client` or `Error 401`

**Cause**:
1. GOOGLE_CLIENT_ID mismatch
2. GOOGLE_CLIENT_SECRET has newline character

**Fix**:
1. Verify CLIENT_ID in .env matches Google Console
2. Re-set env var using `printf '%s'` not `echo`

### Vercel Deployment Errors

**Symptom**: Build fails with missing env vars

**Cause**: Env vars not set or set after deployment

**Fix**: Set env vars, then redeploy

**Symptom**: 404 on staging custom domain

**Cause**: Domain not linked to staging branch or DNS not propagated

**Fix**: Check Vercel dashboard domains settings, wait for DNS

---

**Last Updated**: 2025-11-26
**Version**: MCP Orchestration v1.1 (added Caddy/dnsmasq local domain support)
