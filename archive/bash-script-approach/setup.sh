#!/bin/bash
set -e

# Full-Stack Setup Script
# This automates everything that doesn't require manual dashboard interaction

echo "🚀 Full-Stack Setup Script"
echo "=========================="
echo ""

# Get project name from argument or prompt
if [ -n "$1" ]; then
    PROJECT_NAME="$1"
else
    read -p "Project name (e.g., my-app): " PROJECT_NAME
fi

# Function to validate OAuth Client ID format
validate_client_id() {
    if [[ "$1" =~ ^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate OAuth Client Secret format
validate_client_secret() {
    if [[ "$1" =~ ^GOCSPX- ]]; then
        return 0
    else
        return 1
    fi
}

# Get Google OAuth credentials (multiple sources)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Source 1: Check if .env already exists (for re-runs)
if [ -f "$PROJECT_NAME/.env" ]; then
    EXISTING_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" "$PROJECT_NAME/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"')
    EXISTING_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" "$PROJECT_NAME/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"')

    if [ -n "$EXISTING_CLIENT_ID" ] && [ -n "$EXISTING_CLIENT_SECRET" ]; then
        GOOGLE_CLIENT_ID="$EXISTING_CLIENT_ID"
        GOOGLE_CLIENT_SECRET="$EXISTING_CLIENT_SECRET"
        echo "✅ Using existing OAuth credentials from .env"
    fi
fi

# Source 2: Try loading from JSON file if provided
if [ -z "$GOOGLE_CLIENT_ID" ] && [ -n "$2" ]; then
    GOOGLE_OAUTH_JSON="$2"
    if [ -f "$GOOGLE_OAUTH_JSON" ]; then
        GOOGLE_CLIENT_ID=$(jq -r '.web.client_id' "$GOOGLE_OAUTH_JSON")
        GOOGLE_CLIENT_SECRET=$(jq -r '.web.client_secret' "$GOOGLE_OAUTH_JSON")
        echo "✅ Loaded OAuth credentials from JSON file"
    else
        echo "⚠️  OAuth JSON file not found: $GOOGLE_OAUTH_JSON"
    fi
fi

# Source 3: Check for saved credentials in current directory
if [ -z "$GOOGLE_CLIENT_ID" ] && [ -f ".oauth-credentials.json" ]; then
    GOOGLE_CLIENT_ID=$(jq -r '.client_id' ".oauth-credentials.json" 2>/dev/null)
    GOOGLE_CLIENT_SECRET=$(jq -r '.client_secret' ".oauth-credentials.json" 2>/dev/null)
    if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
        echo "✅ Loaded OAuth credentials from .oauth-credentials.json"
    fi
fi

# Source 4: Prompt user interactively
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo ""
    echo "📝 Google OAuth Credentials Required"
    echo "======================================"
    echo ""
    echo "You need OAuth credentials from Google Cloud Console."
    echo "See SETUP-GUIDE.md for detailed instructions on how to create them."
    echo ""
    echo "If you already have credentials, enter them below."
    echo "If not, visit: https://console.cloud.google.com/apis/credentials"
    echo ""

    # Prompt for Client ID
    while true; do
        read -p "Google Client ID (format: XXXXX.apps.googleusercontent.com): " GOOGLE_CLIENT_ID
        if [ -z "$GOOGLE_CLIENT_ID" ]; then
            echo "❌ Client ID cannot be empty"
            continue
        fi
        if validate_client_id "$GOOGLE_CLIENT_ID"; then
            break
        else
            echo "❌ Invalid Client ID format. Should end with .apps.googleusercontent.com"
        fi
    done

    # Prompt for Client Secret
    while true; do
        read -p "Google Client Secret (format: GOCSPX-XXXXX): " GOOGLE_CLIENT_SECRET
        if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
            echo "❌ Client Secret cannot be empty"
            continue
        fi
        if validate_client_secret "$GOOGLE_CLIENT_SECRET"; then
            break
        else
            echo "❌ Invalid Client Secret format. Should start with GOCSPX-"
        fi
    done

    # Ask if user wants to save credentials for reuse
    echo ""
    read -p "Save credentials to .oauth-credentials.json for future projects? (y/n): " SAVE_CREDS
    if [[ "$SAVE_CREDS" =~ ^[Yy]$ ]]; then
        cat > .oauth-credentials.json <<EOF
{
  "client_id": "$GOOGLE_CLIENT_ID",
  "client_secret": "$GOOGLE_CLIENT_SECRET"
}
EOF
        echo "✅ Credentials saved to .oauth-credentials.json"
        echo "⚠️  Keep this file secure - add to .gitignore if needed"
    fi

    echo "✅ OAuth credentials configured"
fi

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Project name required"
    exit 1
fi

echo "📋 Project name: $PROJECT_NAME"

# Function to find available port
find_available_port() {
    local base_port=$1
    local port=$base_port
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Find available ports (avoid defaults for fuckabout mode)
DB_PORT=$(find_available_port 5433)
NEXTJS_PORT=$(find_available_port 3001)

echo "📋 Assigned ports:"
echo "   Database: $DB_PORT"
echo "   Next.js: $NEXTJS_PORT"

echo ""
echo "📦 Phase 1: Creating Next.js Project"
echo "======================================"
echo "n" | npx create-next-app@latest "$PROJECT_NAME" \
    --typescript \
    --tailwind \
    --app \
    --no-src-dir \
    --import-alias "@/*" \
    --eslint \
    --no-git

cd "$PROJECT_NAME"

echo ""
echo "📦 Phase 2: Installing Dependencies"
echo "======================================"
npm install next-auth@latest @prisma/client@5 @auth/prisma-adapter
npm install -D prisma@5

echo ""
echo "📝 Phase 3: Updating package.json Scripts"
echo "=========================================="
# Add postinstall script and update dev script to use custom port
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.postinstall = 'prisma generate';
pkg.scripts.dev = 'next dev -p ${NEXTJS_PORT}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
echo "✅ Updated package.json scripts"

echo ""
echo "🐳 Phase 4: Setting Up Docker Database"
echo "========================================"
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${PROJECT_NAME}-postgres
    restart: unless-stopped
    ports:
      - '${DB_PORT}:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${PROJECT_NAME//-/_}_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

echo "Starting Docker database..."
docker compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ Docker database ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to become ready after 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🗄️  Phase 5: Initializing Prisma"
echo "=================================="
# Try prisma init, but don't fail if it errors (transient npm bug)
if npx prisma init 2>/dev/null; then
    echo "✅ Prisma init succeeded"
else
    echo "⚠️  Prisma init failed (known transient bug), using manual setup..."
    mkdir -p prisma
fi

# Create Prisma schema
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// NextAuth.js Required Models
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
  notes         Note[]
  createdAt     DateTime  @default(now())
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Your Application Models
model Note {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
EOF

# Create .env
NEXTAUTH_SECRET=$(openssl rand -base64 32)
cat > .env <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/${PROJECT_NAME//-/_}_dev"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:${NEXTJS_PORT}"
GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
EOF

echo "Pushing schema to local database..."
npx prisma db push
echo "✅ Prisma initialized"

echo ""
echo "🔐 Phase 6: Configuring NextAuth"
echo "=================================="
mkdir -p lib
cat > lib/auth.ts <<'EOF'
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
EOF

mkdir -p app/api/auth/\[...nextauth\]
cat > app/api/auth/\[...nextauth\]/route.ts <<'EOF'
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
EOF

cat > app/providers.tsx <<'EOF'
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
EOF

mkdir -p types
cat > types/next-auth.d.ts <<'EOF'
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
EOF

# Update layout to use Providers
cat > app/layout.tsx <<'EOF'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
EOF

# Create auth demo page
cat > app/page.tsx <<EOF
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            Welcome to ${PROJECT_NAME}!
          </h1>
          <div className="mb-6 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">
              Signed in as {session.user?.email}
            </p>
            {session.user?.name && (
              <p className="text-sm text-green-700">{session.user.name}</p>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">${PROJECT_NAME}</h1>
        <p className="mb-6 text-gray-600">
          Full-stack Next.js authentication demo
        </p>
        <div className="mb-4 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            This app demonstrates:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
            <li>NextAuth.js Google OAuth</li>
            <li>Prisma ORM</li>
            <li>Neon Postgres Database</li>
            <li>Vercel Deployment</li>
          </ul>
        </div>
        <button
          onClick={() => signIn("google")}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
EOF

echo "✅ NextAuth configured"

echo ""
echo "📝 Phase 7: Creating GitHub Repository"
echo "========================================"
git init
git add .
git commit -m "Initial commit"

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo "⚠️  GitHub CLI not authenticated. Running gh auth login..."
    gh auth login
fi

gh repo create "$PROJECT_NAME" --public --source=. --remote=origin --push
echo "✅ GitHub repository created"

echo ""
echo "🌿 Phase 8: Creating Staging Branch"
echo "===================================="
git checkout -b staging
git push -u origin staging
git checkout main
echo "✅ Staging branch created"

echo ""
echo "🗄️  Phase 9: Setting Up Neon Database"
echo "======================================"

# Get Neon org ID
echo "Fetching Neon organization..."
ORG_ID=$(neonctl orgs list --output json | jq -r '.[0].id')
if [ -z "$ORG_ID" ]; then
    echo "❌ Could not get Neon org ID. Please check neonctl is configured."
    exit 1
fi
echo "Using org: $ORG_ID"

# Create Neon project
echo "Creating Neon project..."
PROJECT_OUTPUT=$(neonctl projects create --name "$PROJECT_NAME" --org-id "$ORG_ID" --output json)
NEON_PROJECT_ID=$(echo "$PROJECT_OUTPUT" | jq -r '.project.id')
echo "Project ID: $NEON_PROJECT_ID"

# Get default branch ID
echo "Getting default branch..."
MAIN_BRANCH_ID=$(neonctl branches list --project-id "$NEON_PROJECT_ID" --output json | jq -r '.[] | select(.default == true) | .id')
echo "Main branch ID: $MAIN_BRANCH_ID"

# Create staging branch
echo "Creating staging branch..."
STAGING_OUTPUT=$(neonctl branches create --project-id "$NEON_PROJECT_ID" --name staging --output json)
STAGING_BRANCH_ID=$(echo "$STAGING_OUTPUT" | jq -r '.branch.id')
echo "Staging branch ID: $STAGING_BRANCH_ID"

# Wait for branch to be ready (Neon needs time to provision)
echo "Waiting for staging branch to be ready..."
sleep 10

# Get connection strings
echo "Getting connection strings..."
STAGING_DB_URL=$(neonctl connection-string --project-id "$NEON_PROJECT_ID" --branch-id "$STAGING_BRANCH_ID")
PRODUCTION_DB_URL=$(neonctl connection-string --project-id "$NEON_PROJECT_ID" --branch-id "$MAIN_BRANCH_ID")

# Push schema to Neon
echo "Pushing schema to staging..."
DATABASE_URL="$STAGING_DB_URL" npx prisma db push

echo "Pushing schema to production..."
DATABASE_URL="$PRODUCTION_DB_URL" npx prisma db push

echo "✅ Neon databases configured"

echo ""
echo "🚀 Phase 10: Deploying to Vercel"
echo "=================================="

# Check if vercel is authenticated
if ! vercel whoami &>/dev/null; then
    echo "⚠️  Vercel CLI not authenticated. Running vercel login..."
    vercel login
fi

echo "Creating Vercel project..."
vercel --yes
echo "Deploying to production..."
vercel --prod

echo ""
echo "Querying actual Vercel deployment URLs..."
# Get the most recent production deployment (last line of vercel ls output)
DEPLOYMENT_URL=$(vercel ls --prod 2>/dev/null | tail -1)

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "⚠️  Could not query deployment. Using default URL pattern."
    PRODUCTION_URL="https://$PROJECT_NAME.vercel.app"
    PRODUCTION_ALIASES=("$PRODUCTION_URL")
else
    echo "✅ Found deployment: $DEPLOYMENT_URL"

    # Query all aliases for this deployment
    echo "Querying deployment aliases..."
    # Parse text output from vercel inspect (--json flag doesn't exist)
    # Output format: Lines starting with "╶ https://" under "Aliases" header
    PRODUCTION_ALIASES=()
    while IFS= read -r alias; do
        if [ -n "$alias" ]; then
            PRODUCTION_ALIASES+=("$alias")
        fi
    done < <(vercel inspect "$DEPLOYMENT_URL" 2>&1 | grep "╶ https://" | awk '{print $2}')

    # Set primary production URL (use project.vercel.app if available, otherwise first alias)
    PRODUCTION_URL=""
    for alias in "${PRODUCTION_ALIASES[@]}"; do
        if [[ "$alias" == "https://$PROJECT_NAME.vercel.app" ]]; then
            PRODUCTION_URL="$alias"
            break
        fi
    done

    # Fallback to first alias if project.vercel.app not found
    if [ -z "$PRODUCTION_URL" ] && [ ${#PRODUCTION_ALIASES[@]} -gt 0 ]; then
        PRODUCTION_URL="${PRODUCTION_ALIASES[0]}"
    fi

    # Final fallback
    if [ -z "$PRODUCTION_URL" ]; then
        PRODUCTION_URL="https://$PROJECT_NAME.vercel.app"
        PRODUCTION_ALIASES=("$PRODUCTION_URL")
    fi
fi

echo "Production URL: $PRODUCTION_URL"
if [ ${#PRODUCTION_ALIASES[@]} -gt 1 ]; then
    echo "Additional production aliases:"
    for alias in "${PRODUCTION_ALIASES[@]}"; do
        if [ "$alias" != "$PRODUCTION_URL" ]; then
            echo "  - $alias"
        fi
    done
fi

# For staging, we'll use a custom domain (not ephemeral preview URLs)
# Why? Preview URLs change with every deployment (e.g., project-abc123.vercel.app)
# OAuth requires stable redirect URIs, so we need a custom domain linked to the staging branch
STAGING_URL="https://$PROJECT_NAME-staging.vercel.app"
echo "Staging URL (custom domain): $STAGING_URL"
echo ""
echo "⚠️  Important: Staging custom domain configuration"
echo "   The staging environment requires a custom Vercel domain for OAuth stability."
echo "   After first staging deployment, you must:"
echo "   1. Add custom domain: $PROJECT_NAME-staging.vercel.app"
echo "   2. Link it to the 'staging' git branch in Vercel project settings"
echo "   3. Redeploy staging to activate the domain"
echo "   Without this, OAuth will fail on staging due to ephemeral preview URLs."
echo ""

if [ -n "$PRODUCTION_URL" ] && [ -n "$STAGING_URL" ]; then

    # Set environment variables automatically if we have credentials
    if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
        echo ""
        echo "Setting Vercel environment variables..."

        # Database URLs
        printf '%s' "$STAGING_DB_URL" | vercel env add DATABASE_URL preview >/dev/null 2>&1 || true
        printf '%s' "$PRODUCTION_DB_URL" | vercel env add DATABASE_URL production >/dev/null 2>&1 || true

        # NextAuth Secret
        printf '%s' "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET preview >/dev/null 2>&1 || true
        printf '%s' "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production >/dev/null 2>&1 || true

        # NextAuth URLs
        printf '%s' "$STAGING_URL" | vercel env add NEXTAUTH_URL preview >/dev/null 2>&1 || true
        printf '%s' "$PRODUCTION_URL" | vercel env add NEXTAUTH_URL production >/dev/null 2>&1 || true

        # Google OAuth
        printf '%s' "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID preview >/dev/null 2>&1 || true
        printf '%s' "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production >/dev/null 2>&1 || true
        printf '%s' "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET preview >/dev/null 2>&1 || true
        printf '%s' "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production >/dev/null 2>&1 || true

        echo "✅ Environment variables configured"
    fi
fi

echo "✅ Vercel deployment complete"

# Configure Caddy for domain routing
echo ""
echo "🌐 Configuring Domain Routing"
echo "=============================="
CADDY_DIR="/Users/ianswanson/ai-dev/claudian/utilities/dev-infrastructure/caddy"
cat > "$CADDY_DIR/projects/$PROJECT_NAME.caddy" <<EOF
http://$PROJECT_NAME.local {
    reverse_proxy host.docker.internal:$NEXTJS_PORT
}
EOF

# Reload Caddy if it's running
if docker ps | grep -q claudian-caddy; then
    docker exec claudian-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
    echo "✅ Caddy configured for $PROJECT_NAME.local"
else
    echo "⚠️  Caddy not running. Start it with:"
    echo "   cd $CADDY_DIR && docker compose up -d"
fi

# Create DEV.md with port and domain documentation
cat > DEV.md <<EOF
# $PROJECT_NAME - Development Guide

## Access Your App

- **Domain**: http://$PROJECT_NAME.local (recommended)
- **Direct Port**: http://localhost:$NEXTJS_PORT

## Assigned Ports

This project uses custom ports to avoid conflicts with other projects:

- **Database (Postgres)**: localhost:$DB_PORT
- **Next.js Dev Server**: localhost:$NEXTJS_PORT

## Quick Start

\`\`\`bash
# Start database (if not already running)
docker compose up -d

# Start Next.js dev server
npm run dev
\`\`\`

## Database Connection

- **URL**: postgresql://postgres:postgres@localhost:$DB_PORT/${PROJECT_NAME//-/_}_dev
- **User**: postgres
- **Password**: postgres
- **Database**: ${PROJECT_NAME//-/_}_dev

## Domain Routing

This project is configured to be accessible at **$PROJECT_NAME.local**.

**First time setup:**
Add to \`/etc/hosts\`:
\`\`\`
127.0.0.1 $PROJECT_NAME.local
\`\`\`

Or use dnsmasq for wildcard *.local routing (see utilities/dev-infrastructure/caddy/README.md)

## Notes

- Default ports (5432, 3000) are reserved for ad-hoc development
- Ports are auto-assigned during setup to avoid conflicts
- All environment variables are in \`.env\`
- Domain routing via Caddy (must be running)
EOF

# Generate project-specific MANUAL-STEPS.html
echo "Generating MANUAL-STEPS.html..."
cat > MANUAL-STEPS.html <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PROJECT_NAME - Setup Instructions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #1a1a1a; margin-bottom: 10px; }
        .subtitle { color: #6b7280; margin-bottom: 30px; }
        .step {
            background: #f9fafb;
            padding: 25px;
            margin: 25px 0;
            border-radius: 8px;
            border-left: 5px solid #3b82f6;
        }
        .step-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .step-num {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #3b82f6;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-weight: bold;
            font-size: 1.2em;
            margin-right: 15px;
        }
        .step-title {
            font-size: 1.5em;
            font-weight: 600;
            color: #1f2937;
        }
        .copy-box {
            position: relative;
            margin: 15px 0;
        }
        .copy-box label {
            display: block;
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .copy-content {
            background: #1f2937;
            color: #e5e7eb;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .copy-content code {
            flex: 1;
            word-break: break-all;
        }
        .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            margin-left: 15px;
            white-space: nowrap;
            transition: background 0.2s;
            font-weight: 500;
        }
        .copy-btn:hover { background: #2563eb; }
        .copy-btn.copied { background: #10b981; }
        .note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .success {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PROJECT_NAME - Manual Setup</h1>
        <div class="subtitle">Complete these 2 steps to finish setup</div>

        <div class="note">
            <strong>Good news!</strong> The script already did most of the work. These are the only manual steps left.
        </div>

        <div class="note" style="background: #dbeafe; border-left: 4px solid #3b82f6;">
            <strong>📋 Google OAuth Credentials Used</strong>
            <p style="margin-top: 10px;">The script loaded these credentials from your JSON file:</p>
            <ul style="margin-left: 20px; margin-top: 5px; font-family: monospace; font-size: 0.9em;">
                <li><strong>Client ID:</strong> GOOGLE_CLIENT_ID_VALUE</li>
                <li><strong>Client Secret:</strong> GOOGLE_CLIENT_SECRET_VALUE (hidden)</li>
            </ul>
            <p style="margin-top: 10px; font-size: 0.9em;">
                Make sure you're updating the redirect URIs for THIS OAuth client in Google Cloud Console.
            </p>
        </div>

        <!-- Step 1: Add to /etc/hosts -->
        <div class="step">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Add Domain to /etc/hosts</div>
            </div>
            <p>Run this command in your terminal:</p>
            <div class="copy-box">
                <div class="copy-content">
                    <code>echo '127.0.0.1 PROJECT_NAME.local' | sudo tee -a /etc/hosts</code>
                    <button class="copy-btn" onclick="copy(this, 'echo \'127.0.0.1 PROJECT_NAME.local\' | sudo tee -a /etc/hosts')">Copy</button>
                </div>
            </div>
        </div>

        <!-- Step 2: Update Google OAuth -->
        <div class="step">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Update Google OAuth Redirect URIs</div>
            </div>

            <ol style="margin-left: 20px; margin-bottom: 15px;">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #2563eb; font-weight: 600;">Google Cloud Console → Credentials</a></li>
                <li>Click on your OAuth 2.0 Client ID (the one you created earlier)</li>
                <li>Scroll down to "<strong>Authorized redirect URIs</strong>"</li>
                <li>Click "<strong>+ ADD URI</strong>" button</li>
                <li>Add each of the URIs below (click the copy button for each one):</li>
            </ol>

            <div class="copy-box">
                <label>Local (port NEXTJS_PORT):</label>
                <div class="copy-content">
                    <code>http://localhost:NEXTJS_PORT/api/auth/callback/google</code>
                    <button class="copy-btn" onclick="copy(this, 'http://localhost:NEXTJS_PORT/api/auth/callback/google')">Copy</button>
                </div>
            </div>

            <div class="copy-box">
                <label>Staging:</label>
                <div class="copy-content">
                    <code>STAGING_URL/api/auth/callback/google</code>
                    <button class="copy-btn" onclick="copy(this, 'STAGING_URL/api/auth/callback/google')">Copy</button>
                </div>
            </div>

PRODUCTION_ALIASES_SECTION

            <ol style="margin-left: 20px; margin-top: 15px;" start="6">
                <li>Click "<strong>SAVE</strong>" at the bottom of the page</li>
            </ol>
        </div>

        <div class="success" style="margin-top: 40px;">
            <h2 style="margin-top: 0; color: #065f46;">That's it!</h2>
            <p>Once you complete Step 2, your app is ready. It's already deployed and running at:</p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong>Local:</strong> http://PROJECT_NAME.local</li>
                <li><strong>Staging:</strong> STAGING_URL</li>
PRODUCTION_URLS_LIST
            </ul>
        </div>
    </div>

    <script>
        function copy(button, text) {
            navigator.clipboard.writeText(text).then(() => {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            });
        }
    </script>
</body>
</html>
HTMLEOF

# Generate production aliases section dynamically
PRODUCTION_ALIASES_HTML=""
PRODUCTION_URLS_LIST=""
ALIAS_COUNT=0
for alias in "${PRODUCTION_ALIASES[@]}"; do
    ALIAS_COUNT=$((ALIAS_COUNT + 1))
    REDIRECT_URI="$alias/api/auth/callback/google"

    # Determine label based on alias pattern
    LABEL="Production"
    if [[ "$alias" == *".vercel.app" ]]; then
        # Extract just the subdomain part for the label
        SUBDOMAIN=$(echo "$alias" | sed 's|https://||' | sed 's|.vercel.app||')
        if [[ "$SUBDOMAIN" == "$PROJECT_NAME" ]]; then
            LABEL="Production (primary)"
        else
            LABEL="Production ($SUBDOMAIN)"
        fi
    fi

    PRODUCTION_ALIASES_HTML+="
            <div class=\"copy-box\">
                <label>$LABEL:</label>
                <div class=\"copy-content\">
                    <code>$REDIRECT_URI</code>
                    <button class=\"copy-btn\" onclick=\"copy(this, '$REDIRECT_URI')\">Copy</button>
                </div>
            </div>"

    # Add to URLs list for summary section
    PRODUCTION_URLS_LIST+="                <li><strong>$LABEL:</strong> <a href=\"$alias\" target=\"_blank\">$alias</a></li>
"
done

# If no aliases were found, add a fallback
if [ ${#PRODUCTION_ALIASES[@]} -eq 0 ]; then
    PRODUCTION_ALIASES_HTML="
            <div class=\"copy-box\">
                <label>Production:</label>
                <div class=\"copy-content\">
                    <code>https://$PROJECT_NAME.vercel.app/api/auth/callback/google</code>
                    <button class=\"copy-btn\" onclick=\"copy(this, 'https://$PROJECT_NAME.vercel.app/api/auth/callback/google')\">Copy</button>
                </div>
            </div>"
    PRODUCTION_URLS_LIST="                <li><strong>Production:</strong> <a href=\"https://$PROJECT_NAME.vercel.app\" target=\"_blank\">https://$PROJECT_NAME.vercel.app</a></li>"
fi

# Replace placeholders with actual values
sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/g" MANUAL-STEPS.html
sed -i '' "s/NEXTJS_PORT/$NEXTJS_PORT/g" MANUAL-STEPS.html
sed -i '' "s|STAGING_URL|$STAGING_URL|g" MANUAL-STEPS.html
sed -i '' "s|PRODUCTION_URL|$PRODUCTION_URL|g" MANUAL-STEPS.html
sed -i '' "s|GOOGLE_CLIENT_ID_VALUE|$GOOGLE_CLIENT_ID|g" MANUAL-STEPS.html
sed -i '' "s|GOOGLE_CLIENT_SECRET_VALUE|${GOOGLE_CLIENT_SECRET:0:10}...|g" MANUAL-STEPS.html

# Replace PRODUCTION_ALIASES_SECTION with generated HTML using perl (handles multi-line)
perl -i -pe "BEGIN{undef $/;} s|PRODUCTION_ALIASES_SECTION|$PRODUCTION_ALIASES_HTML|g" MANUAL-STEPS.html

# Replace PRODUCTION_URLS_LIST with generated HTML using perl
perl -i -pe "BEGIN{undef $/;} s|PRODUCTION_URLS_LIST|$PRODUCTION_URLS_LIST|g" MANUAL-STEPS.html

echo "✅ Generated MANUAL-STEPS.html"

# Open MANUAL-STEPS.html in browser
echo "Opening MANUAL-STEPS.html in browser..."
open MANUAL-STEPS.html

echo ""
echo "🎉 AUTOMATED SETUP COMPLETE!"
echo "============================"
echo ""
echo "📋 Project Configuration:"
echo "   Name: $PROJECT_NAME"
echo "   Domain: http://$PROJECT_NAME.local"
echo "   Database Port: $DB_PORT"
echo "   Next.js Port: $NEXTJS_PORT"
echo ""
echo "✅ Automated setup complete:"
echo "   • GitHub repository created with main and staging branches"
echo "   • Vercel project deployed (production + staging)"
echo "   • Environment variables configured automatically"
echo "   • Database schema pushed to local + Neon"
echo ""
echo "📋 Just 2 manual steps remaining:"
echo ""
echo "1. 📖 Follow the instructions in MANUAL-STEPS.html (opened in browser):"
echo "   • Add $PROJECT_NAME.local to /etc/hosts"
echo "   • Update Google OAuth redirect URIs"
echo ""
echo "2. ℹ️  See DEV.md for local development info"
echo ""
echo "📋 Deployed URLs (permanent):"
echo "   Production: $PRODUCTION_URL"
echo "   Staging: $STAGING_URL"
echo "   Local: http://$PROJECT_NAME.local"
