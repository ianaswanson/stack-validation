# Full-Stack Setup - Meta Context

**What this project is**: Building an "easy button" for full-stack project setup with OAuth across multiple environments.

**Current approach**: Claude Code orchestration using MCP servers (not bash scripts).

**Status**: In development - iterating on the MCP orchestration approach.

---

## Goal

Enable Ian to go from zero → fully working full-stack app with Google OAuth in 3 environments:
- **Local**: http://localhost:PORT
- **Staging**: https://project-staging.vercel.app
- **Production**: https://project.vercel.app (+ 2-3 aliases)

With **minimal manual steps** (only what Claude Code/MCP cannot automate).

---

## Key Files

### This Project (Meta-Level)
1. **CLAUDE.md** (this file) - Context for building and maintaining the system
2. **LOG.md** - Record of all attempts, what worked/didn't, issues discovered
3. **FULL-STACK-SETUP.md** - **THE EXECUTABLE SPEC** - Follow these instructions exactly

### Archive
- `archive/bash-script-approach/` - Previous bash script implementation (stack9-15)
- See LOG.md for why we pivoted from bash to MCP orchestration

---

## Your Job

**Primary responsibility**: Follow FULL-STACK-SETUP.md exactly to create full-stack projects.

**When user says**: "Create full-stack project called X with Google OAuth"

**You do**: Execute FULL-STACK-SETUP.md step-by-step, stopping at UAT gates for human validation.

**When something fails**:
1. Document the failure in LOG.md
2. Update FULL-STACK-SETUP.md with the fix
3. Test the updated instructions
4. Never repeat failed approaches (check LOG.md first)

**Critical**: FULL-STACK-SETUP.md must be portable - other projects will copy it and expect it to work without references to stack-validation context.

---

## Core Principles

### 1. Vertical Slices
Build and **validate** one complete environment before starting the next:
- **Slice 1**: Local → test OAuth → confirm working
- **Slice 2**: Production → test OAuth on all URLs → confirm working
- **Slice 3**: Staging → test OAuth → confirm working

**Do NOT move to next slice until current slice is fully validated by human.**

### 2. UAT Gates Are Required
Script/automation completion ≠ success. Human must verify:
- **UAT Gate 1** (after each environment setup): Add OAuth URIs to Google Console
- **UAT Gate 2** (after URIs added): Test OAuth sign-in, report if it works

**Format**: Claude pauses → shows exactly what human needs to do → waits for confirmation

### 3. Use MCP Tools Directly
Claude Code has MCP servers for Neon, Vercel, GitHub. Use them instead of CLI parsing:
- ✅ `mcp__Neon__create_project` (not `neonctl create`)
- ✅ `mcp__vercel__deploy_to_vercel` (not `vercel deploy`)
- ✅ Vercel MCP can add custom domains programmatically (bash script couldn't)

### 4. Limit Manual Steps to What's Truly Required
**Human MUST do**:
- Add OAuth redirect URIs to Google Cloud Console (no API)
- Test OAuth sign-in (requires actual browser interaction)
- Add to /etc/hosts (requires sudo)

**Claude CAN do** (via MCP):
- Create Neon databases
- Deploy to Vercel
- Add Vercel custom domains
- Set environment variables
- Query deployment URLs

---

## What We Learned from Bash Script Approach

See `LOG.md` for full history. Key takeaways:

### Technical Issues Discovered
1. **OAuth URL Management**: Vercel generates 3+ aliases per deployment, ALL must be added to Google Console
2. **Timing Dependencies**: Neon branches need 5-10s to provision, Docker needs pg_isready wait
3. **Staging URL Problem**: Preview URLs are ephemeral, requires custom domain
4. **CLI Parsing is Fragile**: Text output changes, stderr vs stdout inconsistent

### Process Issues
1. **No UAT gates initially**: We ran full automation then discovered OAuth didn't work
2. **All-or-nothing approach**: Script ran 10 phases straight through, hard to debug failures
3. **Wrong success criteria**: "Script completed" isn't the same as "OAuth works"

---

## How to Execute (MCP Orchestration Approach)

### When User Says: "Create full-stack project called X with Google OAuth"

**Phase 1: Gather OAuth Credentials**

Ask user for OAuth credentials file path (or use saved credentials):
- "Where is your Google OAuth credentials JSON file?"
- Default: `~/Downloads/client_secret_*.json`
- Parse JSON to extract `client_id` and `client_secret`

---

**Phase 2: Slice 1 - Local Environment**

1. Create Next.js project structure:
   - TypeScript + Tailwind + App Router
   - Install: next-auth, @prisma/client, pg
   - Create app structure (pages, API routes, providers)

2. Set up Docker PostgreSQL:
   - Generate docker-compose.yml with unique port
   - Start container: `docker compose up -d`
   - Wait for ready: `pg_isready` loop

3. Configure Prisma:
   - Create schema with NextAuth models
   - Generate unique connection string
   - Push schema: `npx prisma db push`

4. Configure NextAuth:
   - Create lib/auth.ts with Google provider
   - Create API route: app/api/auth/[...nextauth]/route.ts
   - Generate NEXTAUTH_SECRET (openssl)
   - Write .env with all variables

5. Create pages:
   - Landing page with "Sign in with Google"
   - Protected dashboard page
   - SessionProvider wrapper

6. Start dev server:
   - `npm run dev` (in background)

**⚠️ UAT GATE 1 - STOP HERE**

Tell human:
```
Local environment ready at http://localhost:PORT

**Manual Step**: Add this OAuth redirect URI to Google Cloud Console:
  http://localhost:PORT/api/auth/callback/google

Steps:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", click "+ ADD URI"
4. Paste: http://localhost:PORT/api/auth/callback/google
5. Click SAVE

Then visit http://localhost:PORT and test sign-in.

Did it work? (Tell me "local works" or describe the error)
```

**Wait for human response**. If broken, debug before proceeding.

---

**Phase 3: Slice 2 - Production Environment**

1. Create GitHub repository:
   - Initialize git: `git init`
   - Create .gitignore
   - Initial commit
   - Create repo: `gh repo create`
   - Push to main

2. Create Neon production database:
   - Use `mcp__Neon__create_project`
   - Get default branch ID
   - Get connection string
   - Push schema to production

3. Deploy to Vercel (production):
   - Use `mcp__vercel__deploy_to_vercel`
   - Link to GitHub repo
   - Use `mcp__vercel__list_deployments` to get deployment info
   - Use `mcp__vercel__get_deployment` to get aliases

4. Set Vercel environment variables:
   - Use Vercel MCP to set env vars (not CLI)
   - Set for production environment:
     - DATABASE_URL (production Neon)
     - NEXTAUTH_SECRET
     - NEXTAUTH_URL (primary production URL)
     - GOOGLE_CLIENT_ID
     - GOOGLE_CLIENT_SECRET

**⚠️ UAT GATE 2 - STOP HERE**

Tell human:
```
Production deployed. Found 3 deployment aliases.

**Manual Step**: Add these OAuth redirect URIs to Google Cloud Console:
  https://project.vercel.app/api/auth/callback/google
  https://project-team.vercel.app/api/auth/callback/google
  https://project-unique-team.vercel.app/api/auth/callback/google

Go to Google Cloud Console and add ALL 3 URIs, then click SAVE.

Then test sign-in on EACH URL:
1. https://project.vercel.app
2. https://project-team.vercel.app
3. https://project-unique-team.vercel.app

Report back: Which URLs work? Which fail?
```

**Wait for human response**. If any broken, debug before proceeding.

---

**Phase 4: Slice 3 - Staging Environment**

1. Create staging branch:
   - `git checkout -b staging`
   - Push: `git push -u origin staging`

2. Create Neon staging database:
   - Use `mcp__Neon__create_branch`
   - **Wait 10 seconds** for Neon to provision
   - Get connection string
   - Push schema to staging

3. Set up Vercel staging with custom domain:
   - Use Vercel MCP to add custom domain: `project-staging.vercel.app`
   - Link domain to "staging" git branch
   - Deploy staging
   - Verify domain is active

4. Set Vercel environment variables (staging):
   - DATABASE_URL (staging Neon)
   - NEXTAUTH_URL (staging custom domain)
   - Same NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

**⚠️ UAT GATE 3 - STOP HERE**

Tell human:
```
Staging deployed at https://project-staging.vercel.app

**Manual Step**: Add this OAuth redirect URI to Google Cloud Console:
  https://project-staging.vercel.app/api/auth/callback/google

Go to Google Cloud Console, add the URI, click SAVE.

Then test sign-in at https://project-staging.vercel.app

Did it work?
```

**Wait for human response**. If broken, debug before proceeding.

---

**Phase 5: Completion**

Tell human:
```
✅ All 3 environments validated and working!

You now have:
- Local: http://localhost:PORT
- Staging: https://project-staging.vercel.app
- Production: https://project.vercel.app (+ 2 aliases)

All with Google OAuth authentication working.

GitHub repo: https://github.com/user/project
Neon dashboard: https://console.neon.tech
Vercel dashboard: https://vercel.com/user/project

Next steps: See FULL-STACK-SETUP.md for development workflow.
```

---

## Important Implementation Notes

### MCP Tool Usage

**Neon MCP**:
- `mcp__Neon__list_projects` - Check if project already exists
- `mcp__Neon__create_project` - Create new database project
- `mcp__Neon__create_branch` - Create staging branch
- `mcp__Neon__get_connection_string` - Get connection strings
- `mcp__Neon__run_sql` - Push Prisma schema

**Vercel MCP**:
- `mcp__vercel__deploy_to_vercel` - Deploy from local
- `mcp__vercel__list_deployments` - Get deployment info
- `mcp__vercel__get_deployment` - Get aliases
- `mcp__vercel__get_project` - Check domain configuration
- Use MCP to set env vars (not `vercel env add` CLI)

**GitHub**:
- Use `gh` CLI (MCP not needed for basic operations)

### Timing Considerations

**After creating Neon branch**: Wait 10 seconds before using it
```bash
sleep 10
```

**After starting Docker**: Wait for pg_isready
```bash
until docker exec container pg_isready; do
  sleep 1
done
```

### OAuth URL Discovery

**Don't assume URL patterns**. Always query actual deployment:
- Vercel MCP returns full deployment object with aliases array
- Typically 3 URLs: primary + team + unique
- ALL must be added to Google Console

---

## Session Startup Protocol

When starting a new session:

1. **Read LOG.md** - Check what's been tried, what failed, current status
2. **Check if user wants to**:
   - Test the current approach (run Slice 1-3)
   - Fix a specific issue
   - Try something different
3. **If testing**: Follow the MCP orchestration approach above
4. **If issues found**: Document in LOG.md before fixing
5. **Always use UAT gates** - Don't proceed without human validation

---

## What Success Looks Like

**For this meta-project**:
- User can say "Create full-stack project X" and Claude orchestrates everything
- UAT gates ensure each environment works before moving forward
- Process takes ~10-15 minutes total (including human steps)
- Documentation (FULL-STACK-SETUP.md) is clear enough for other teams

**For a successful iteration**:
- All 3 slices complete
- Human validates OAuth works in all 3 environments
- No manual Vercel dashboard work required (custom domains automated)
- Clear communication at each UAT gate

---

**Last Updated**: 2025-11-23
**Current Status**: Ready to test MCP orchestration approach
