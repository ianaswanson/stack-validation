# Setup Script Status

**Last Updated**: 2025-11-22
**Status**: ✅ All automation improvements complete

## Latest Improvements (2025-11-22)

### 1. Database Connection Reliability
**Fixed in**: Lines 102-114
- Added `pg_isready` wait loop after Docker starts
- 30-second timeout with proper error handling
- Prevents Prisma connection failures

### 2. Permanent Vercel URLs
**Fixed in**: Lines 488-527
- Construct permanent URLs instead of parsing ephemeral ones
- Production: `https://{project}.vercel.app`
- Staging: `https://{project}-git-staging-{team}.vercel.app`
- Critical for OAuth redirect URI stability

### 3. Automated Environment Variable Setup
**Fixed in**: Lines 488-527
- Automatically loads Google OAuth credentials from JSON file
- Sets all Vercel environment variables automatically:
  - DATABASE_URL (staging + production)
  - NEXTAUTH_SECRET (staging + production)  
  - NEXTAUTH_URL (staging + production)
  - GOOGLE_CLIENT_ID (staging + production)
  - GOOGLE_CLIENT_SECRET (staging + production)
- No manual vercel env add commands needed

### 4. Simplified Manual Steps
**Fixed in**: Lines 610-824
- Reduced from 10+ manual steps to just 2:
  1. Add domain to /etc/hosts
  2. Update Google OAuth redirect URIs
- Clear messaging: "The script already did most of the work"
- All copy buttons functional with proper quote escaping

### 5. sed Delimiter Fix
**Fixed in**: Line 824
- Changed delimiter from `/` to `|` to handle NEXTAUTH_SECRET with `/` characters
- Prevents "bad flag in substitute command" errors

## Test Results

### stack7
- ❌ Database connection timeout (no wait mechanism)
- ✅ Fixed with pg_isready loop

### stack8
- ✅ All 10 phases completed successfully
- ✅ Permanent URLs constructed correctly
- ✅ All environment variables set automatically
- ✅ MANUAL-STEPS.html generated with working copy buttons
- ✅ Only 2 manual steps required

## What the Script Automates

### Phase 1-10: Full Application Setup
1. **Next.js Project Creation** - TypeScript, Tailwind, App Router
2. **Dependency Installation** - NextAuth, Prisma
3. **Package.json Configuration** - Port assignment, postinstall script
4. **Docker Database** - PostgreSQL container with health check
5. **Prisma Initialization** - Schema, migrations, client generation
6. **NextAuth Configuration** - Google OAuth, session provider
7. **GitHub Repository** - Initial commit, remote creation
8. **Staging Branch** - Separate branch for preview deployments
9. **Neon Database** - Production and staging branches
10. **Vercel Deployment** - Production + staging with environment variables

### Phase 11-12: Documentation
11. **Domain Routing** - Caddy configuration for .local domain
12. **Documentation** - DEV.md and MANUAL-STEPS.html

## What Requires Manual Steps

### Step 1: /etc/hosts Entry
**Why**: Requires sudo privileges
```bash
echo '127.0.0.1 projectname.local' | sudo tee -a /etc/hosts
```

### Step 2: Google OAuth Redirect URIs  
**Why**: Requires interactive web console access
- Add 3 redirect URIs (local, staging, production)
- Detailed step-by-step instructions in MANUAL-STEPS.html

## Architecture Decisions

### URL Strategy
- **Permanent URLs only** for OAuth and environment variables
- **Ephemeral URLs** avoided (they change on every deploy)
- Team slug automatically fetched from `vercel teams ls`

### Environment Variable Management
- Script loads Google OAuth credentials from JSON file
- All variables injected automatically via `vercel env add`
- User only needs to update OAuth console (can't automate web UI)

### Branch Strategy
- `main` → Production (https://project.vercel.app)
- `staging` → Preview (https://project-git-staging-team.vercel.app)
- `feature/*` → Local development only

## Files Modified

- `setup.sh` (lines 1-35): Google OAuth JSON parsing
- `setup.sh` (lines 102-114): Database wait mechanism
- `setup.sh` (lines 488-527): Permanent URLs + auto env vars
- `setup.sh` (lines 610-824): Simplified HTML template
- `setup.sh` (lines 963-983): Updated final output

## Prerequisites

The script requires:
- Google OAuth credentials JSON file (downloaded from Google Cloud Console)
- Authenticated CLI tools:
  - `vercel login`
  - `neonctl auth`
  - `gh auth login`
- Caddy reverse proxy running (for .local domain routing)
- Docker Desktop (for local database)

## Usage

```bash
cd /Users/ianswanson/ai-dev/claudian/utilities/stack-validation

# Run with default Google OAuth JSON path
./setup.sh my-project

# Or specify custom path
./setup.sh my-project /path/to/google-oauth.json
```

## Success Criteria

After running the script and completing 2 manual steps:
- ✅ Application deployed to Vercel (production + staging)
- ✅ Databases created and connected (Neon)
- ✅ All environment variables configured
- ✅ GitHub repository created with main + staging branches
- ✅ Local development ready at http://projectname.local
- ✅ Staging accessible at permanent URL
- ✅ Production accessible at permanent URL

## Next Steps

- [x] Test with fresh project (stack9) to validate all fixes ✅
- [ ] Fix: Local .env file not updated with Google OAuth credentials (discovered in stack9)
- [ ] Consider adding health check endpoint validation
- [ ] Add automatic OAuth redirect URI update (if Google API available)
- [ ] Add rollback mechanism if any phase fails
- [ ] Support multiple OAuth providers (GitHub, GitLab)

## Known Limitations

1. **Google OAuth JSON file must exist** - No validation before starting
2. **Caddy must be running** - No check before configuring domain
3. **CLI tools must be authenticated** - No pre-flight validation
4. **No rollback on failure** - Partial setup requires manual cleanup
5. **Local .env not updated with OAuth credentials** - Script loads from JSON and sets Vercel env vars but leaves local .env with REPLACE_ME placeholders (discovered in stack9 testing)

## Lessons Learned

1. **Quote escaping matters** - Use simple commands (echo | tee) over complex ones (sudo sh -c)
2. **sed delimiters** - Use | when replacement contains / characters
3. **Ephemeral URLs are dangerous** - Always use permanent URLs for OAuth
4. **Database health checks are essential** - pg_isready prevents race conditions
5. **Manual steps should be minimal** - Automate everything except what requires sudo or web UI

---

**Automation Philosophy**: Script does EVERYTHING it can. Manual steps are ONLY for things that require:
- Sudo privileges (can't automate safely)
- Interactive web console (no API available)

This ensures minimum friction and maximum repeatability.
