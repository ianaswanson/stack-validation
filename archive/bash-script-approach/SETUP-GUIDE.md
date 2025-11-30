# Full-Stack Setup Script - Usage Guide

**Purpose**: Automate production-ready Next.js + NextAuth + Prisma + Neon + Vercel setup.

**What it does**: Creates a complete full-stack application with authentication, database, and deployment in ~3 minutes (vs 2-3 hours manual).

---

## Prerequisites

### 1. CLI Tools (Authenticated)

You must be logged in to these services BEFORE running the script:

```bash
# Check authentication status
vercel whoami        # Should show your username
neonctl auth show    # Should show your email
gh auth status       # Should show "Logged in to github.com"

# If not authenticated, run:
vercel login
neonctl auth
gh auth login
```

### 2. Google OAuth Credentials JSON

**Required**: Download OAuth credentials from Google Cloud Console.

#### Creating OAuth 2.0 Credentials

**Step 1: Access Google Cloud Console**
1. Go to https://console.cloud.google.com/apis/credentials
2. If prompted, select or create a Google Cloud project
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

**Step 2: Configure Consent Screen (if first time)**

If you haven't set up the OAuth consent screen:
1. You'll be redirected to configure it first
2. Choose **"External"** (unless you have a Google Workspace organization)
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: Your application name (e.g., "My App")
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Save and Continue"** (no additional scopes needed)
7. **Test users**: Click **"Save and Continue"** (optional, but recommended to add your email)
8. Click **"Back to Dashboard"**

**Step 3: Create OAuth Client ID**

Now go back to https://console.cloud.google.com/apis/credentials and create credentials:

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. **Application type**: Select **"Web application"**
3. **Name**: Enter a descriptive name (e.g., "My App - Development")
4. **Authorized JavaScript origins**: Leave empty (not needed for server-side auth)
5. **Authorized redirect URIs**: Leave empty for now
   - The script will tell you which URIs to add after deployment
   - You'll add 3 URIs: local, staging, and production
6. Click **"CREATE"**

**Step 4: Download Credentials**

1. A dialog will show your **Client ID** and **Client Secret**
2. Click **"DOWNLOAD JSON"** (or click the download icon 📥 next to the credential in the list)
3. Save the file - it will be named like: `client_secret_XXXXX.apps.googleusercontent.com.json`
4. **Remember the file path** - you'll pass it to the setup script

**Default path**: `~/Downloads/client_secret_*.json` (if just downloaded)

#### Understanding the JSON File

The downloaded JSON contains:
```json
{
  "web": {
    "client_id": "XXXXX.apps.googleusercontent.com",
    "client_secret": "GOCSPX-XXXXX",
    "auth_uri": "...",
    "token_uri": "...",
    "redirect_uris": []
  }
}
```

The script extracts:
- `client_id` → Used as `GOOGLE_CLIENT_ID`
- `client_secret` → Used as `GOOGLE_CLIENT_SECRET`

#### Security Notes

⚠️ **Keep credential files secure**:
- Don't commit to git (add to `.gitignore`)
- Don't share publicly
- Treat like passwords
- Files to protect:
  - `client_secret_*.json` (downloaded from Google)
  - `.oauth-credentials.json` (created by setup script)

**Recommended .gitignore entries**:
```gitignore
client_secret_*.json
.oauth-credentials.json
```

✅ **Safe to reuse**: You can use the same OAuth credentials across multiple projects during development

### 3. Docker Desktop

Must be running for local database.

```bash
docker ps  # Should work without errors
```

### 4. System Dependencies

- Node.js 18+
- Caddy (for .local domain routing) - optional but recommended

---

## Usage

```bash
cd /path/to/claudian/utilities/stack-validation

# Basic usage (will prompt for credentials)
./setup.sh my-project

# Or provide OAuth JSON file
./setup.sh my-project /path/to/google-oauth.json
```

### OAuth Credential Options

The script supports **4 ways** to provide OAuth credentials (in order of precedence):

1. **Existing .env file** - If re-running setup, uses credentials from existing `.env`
2. **JSON file path** - Pass as second argument: `./setup.sh my-project /path/to/creds.json`
3. **Saved credentials** - Uses `.oauth-credentials.json` if exists in current directory
4. **Interactive prompts** - Asks you to enter credentials with validation

**Recommended workflow**:
- First time: Run script, enter credentials when prompted, save to `.oauth-credentials.json`
- Future projects: Script automatically loads from `.oauth-credentials.json`

**What happens**:
1. Script obtains Google OAuth credentials (via one of the 4 methods above)
2. Runs 10 automated phases (see below)
3. Generates `MANUAL-STEPS.html` with 2 remaining steps
4. Opens HTML in browser

**Duration**: ~3 minutes (mostly waiting for npm/deployment)

---

## What Gets Automated (10 Phases)

### Phase 1: Next.js Project
- Creates Next.js app with TypeScript, Tailwind, App Router
- Installs dependencies (NextAuth, Prisma, pg)
- Adds postinstall script for Prisma

### Phase 2: Dependencies
- Installs NextAuth.js
- Installs Prisma 5 (stable)
- Installs PostgreSQL client

### Phase 3: Package Configuration
- Assigns unique ports (database, Next.js)
- Updates package.json scripts
- Configures development environment

### Phase 4: Docker Database
- Creates docker-compose.yml
- Starts PostgreSQL container
- Waits for database to be ready (pg_isready)

### Phase 5: Prisma
- Creates schema with NextAuth models
- Pushes schema to local database
- Generates Prisma Client

### Phase 6: NextAuth Configuration
- Creates lib/auth.ts
- Creates API route handler
- Creates SessionProvider wrapper
- Generates NEXTAUTH_SECRET

### Phase 7: GitHub Repository
- Initializes git repository
- Creates initial commit
- Creates GitHub repository
- Pushes to remote

### Phase 8: Staging Branch
- Creates staging branch
- Pushes to GitHub
- Sets up branch tracking

### Phase 9: Neon Database
- Creates Neon project
- Creates staging and production branches
- Pushes schema to both environments
- Saves connection strings

### Phase 10: Vercel Deployment
- Creates Vercel project
- Links to GitHub repository
- Deploys production and staging
- Sets ALL environment variables automatically:
  - DATABASE_URL (staging + production)
  - NEXTAUTH_SECRET (staging + production)
  - NEXTAUTH_URL (staging + production)
  - GOOGLE_CLIENT_ID (staging + production)
  - GOOGLE_CLIENT_SECRET (staging + production)

**Result**: Actual deployment URLs queried and displayed:
- Production: All aliases discovered (typically 2-3 URLs per deployment)
- Staging: Custom domain required (`https://project-name-staging.vercel.app`)

---

## OAuth URL Discovery Pattern

**Critical learning from stack12 validation**: Never assume Vercel URL patterns.

### The Problem

Vercel generates multiple URL aliases per deployment, and these patterns are **unpredictable**:

**Example from stack12**:
- ❌ Assumed: `stack12-git-main-ian-swansons-projects.vercel.app`
- ✅ Actual: `stack12.vercel.app`, `stack12-ian-swansons-projects.vercel.app`, `stack12-ian-5012-ian-swansons-projects.vercel.app`

Hardcoding URL patterns leads to OAuth `redirect_uri_mismatch` errors.

### The Solution

After Vercel deployment completes, the script:

1. **Queries actual deployment aliases** via `vercel inspect`:
   ```bash
   vercel inspect <deployment-url> --json | jq -r '.alias[]'
   ```

2. **Generates MANUAL-STEPS.html** with ALL discovered production URLs:
   - Primary: `project-name.vercel.app`
   - Team aliases: `project-name-team-slug.vercel.app`
   - Branch aliases: `project-name-git-main-team.vercel.app` (if any)

3. **For staging**: Uses custom domain instead of ephemeral preview URLs
   - Preview URLs change with every deployment: `project-abc123.vercel.app`
   - OAuth requires stable URLs
   - Solution: Add `project-name-staging.vercel.app` linked to staging branch

### Why This Matters

**All production aliases must be added to Google OAuth**. If any alias is missing:
- User clicks sign-in → redirected to missing URL
- OAuth fails with `redirect_uri_mismatch`
- Debugging wastes 30+ minutes

The script eliminates this by discovering and displaying ALL URLs automatically.

### Implementation in setup.sh

```bash
# After vercel --prod deployment
DEPLOYMENT_URL=$(vercel ls --prod | head -1 | awk '{print $2}')
ALIASES_JSON=$(vercel inspect "$DEPLOYMENT_URL" --json | jq -r '.alias')

# Parse all aliases into array
PRODUCTION_ALIASES=()
while IFS= read -r alias; do
    PRODUCTION_ALIASES+=("https://$alias")
done < <(echo "$ALIASES_JSON" | jq -r '.[]?')

# Generate MANUAL-STEPS.html with all aliases
for alias in "${PRODUCTION_ALIASES[@]}"; do
    echo "<li>$alias/api/auth/callback/google</li>"
done
```

---

## What Requires Manual Steps (2 Only)

After the script completes, open `MANUAL-STEPS.html` for instructions:

### Step 1: Add Domain to /etc/hosts
**Why manual**: Requires sudo privileges

```bash
echo '127.0.0.1 project-name.local' | sudo tee -a /etc/hosts
```

### Step 2: Update Google OAuth Redirect URIs
**Why manual**: Requires interactive web console access

**Important**: `MANUAL-STEPS.html` will show ALL actual URLs discovered from your deployment.

Typical redirect URIs to add (exact URLs shown in MANUAL-STEPS.html):
1. `http://localhost:<port>/api/auth/callback/google` (local)
2. `https://project-name-staging.vercel.app/api/auth/callback/google` (staging)
3. **2-3 production URLs** (all discovered aliases):
   - `https://project-name.vercel.app/api/auth/callback/google`
   - `https://project-name-team-slug.vercel.app/api/auth/callback/google`
   - `https://project-name-<unique-id>-team-slug.vercel.app/api/auth/callback/google` (if present)

**You must add ALL URLs shown in MANUAL-STEPS.html**. Missing even one will cause OAuth errors.

**That's it.** Everything else is done.

---

## Project Structure Created

```
project-name/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth handler
│   ├── dashboard/page.tsx               # Protected page example
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Home page with sign-in
│   └── providers.tsx                    # SessionProvider wrapper
├── lib/
│   └── auth.ts                          # NextAuth configuration
├── prisma/
│   └── schema.prisma                    # Database schema
├── docker-compose.yml                   # Local PostgreSQL
├── .env                                 # Local environment variables
├── package.json                         # Dependencies + scripts
└── MANUAL-STEPS.html                    # Instructions for you
```

---

## Environment Variables (All Automated)

The script automatically configures:

### Local (.env file)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/project_dev"
NEXTAUTH_SECRET="<generated>"
NEXTAUTH_URL="http://localhost:3001"
GOOGLE_CLIENT_ID="<from JSON file>"
GOOGLE_CLIENT_SECRET="<from JSON file>"
```

### Vercel (Staging)
- DATABASE_URL → Neon staging branch
- NEXTAUTH_URL → Staging permanent URL
- NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same as production)

### Vercel (Production)
- DATABASE_URL → Neon production branch
- NEXTAUTH_URL → Production permanent URL
- NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same as staging)

**No manual `vercel env add` commands needed.**

---

## Ports Assigned

Each project gets unique ports to avoid conflicts:

- **Database**: 5430-5439 (auto-assigned)
- **Next.js**: 3000-3009 (auto-assigned)

Check `package.json` scripts to see which ports your project uses.

---

## Troubleshooting

### Script fails with "Disk space full"
```bash
# Clean up old test projects
rm -rf /path/to/test-projects/stack*

# Clear npm cache
rm -rf ~/.npm/_cacache
```

### Database connection timeout
The script waits 30 seconds for PostgreSQL. If it times out:
```bash
# Check Docker
docker ps
docker logs project-name-postgres

# Restart container
docker compose -f /path/to/project/docker-compose.yml restart
```

### Vercel deployment 404 for staging
Push an empty commit to trigger deployment:
```bash
cd /path/to/project
git checkout staging
git commit --allow-empty -m "Trigger deployment"
git push origin staging
```

### Google OAuth "Error 401: invalid_client"
Check that redirect URIs are added to Google Cloud Console AND that you completed Step 2 from MANUAL-STEPS.html.

### "Could not get team slug" warning
This is harmless. The script uses default URL format (`project-git-staging.vercel.app`) which still works.

---

## Testing the Setup

After completing manual steps:

### Test Local
```bash
cd /path/to/project
npm run dev
# Visit http://localhost:3001 (or assigned port)
# Click "Sign in with Google"
```

### Test Staging
```bash
# Visit https://project-name-git-staging.vercel.app
# Click "Sign in with Google"
```

### Test Production
```bash
# Visit https://project-name.vercel.app
# Click "Sign in with Google"
```

All three should successfully authenticate with Google OAuth.

---

## Development Workflow

After setup completes, use this workflow:

### Local Development
```bash
cd /path/to/project

# Ensure database is running
docker compose up -d

# Start dev server
npm run dev

# Visit http://localhost:3001 (or assigned port)
```

### Deploy to Staging
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "Add feature"

# Push and create PR to staging
git push -u origin feature/my-feature
gh pr create --base staging --title "My feature"

# After merge: Vercel auto-deploys to staging URL
```

### Deploy to Production
```bash
# Create PR from staging to main
git checkout staging
gh pr create --base main --head staging --title "Release: My feature"

# After merge: Vercel auto-deploys to production URL
```

---

## Known Limitations

1. **Google OAuth JSON must exist**: No validation before starting
2. **Caddy must be running**: No check before configuring domain (optional)
3. **CLI tools must be authenticated**: No pre-flight validation
4. **No rollback on failure**: Partial setup requires manual cleanup

---

## Success Criteria

After running setup + 2 manual steps, you should have:

- ✅ Application deployed to Vercel (production + staging)
- ✅ Databases created and connected (Neon)
- ✅ All environment variables configured
- ✅ GitHub repository with main + staging branches
- ✅ Local development ready at http://project-name.local
- ✅ Google OAuth working in all 3 environments

**Total time**: ~5 minutes (3 min script + 2 min manual steps)

---

**Last Updated**: 2025-11-22
**Script Version**: Compatible with setup.sh in this directory
