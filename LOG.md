# Full-Stack Setup - Development Log

**Purpose**: Record of all attempts to create an "easy button" for full-stack project setup with OAuth across multiple environments.

---

## Current Status: Process Adherence Issues

**Date**: 2025-11-27
**Status**: Stack18 ABORTED - Failed to follow FULL-STACK-SETUP.md executable spec

---

### Stack18 (v1.1-MCP) - Process Adherence Failure ❌ ABORTED

- **Date**: 2025-11-27
- **Status**: ABORTED - Failed to follow documented process
- **Duration**: ~30 minutes before user caught the issues
- **Result**: ❌ **FAILURE** - AI did not follow FULL-STACK-SETUP.md instructions
- **What Happened**:
  - User requested: "create stack 18"
  - AI jumped straight into implementation without reading FULL-STACK-SETUP.md
  - Used general knowledge/pattern matching instead of following the executable spec
- **Critical Failures**:
  1. **Skipped Prerequisites Check** - Did not verify vercel/neonctl/gh auth, docker, dnsmasq, caddy status
  2. **Wrong Prisma Version** - Used Prisma 7.x instead of specified Prisma 5.x (despite Issue #52 documenting this)
  3. **Wrong Port Assignment** - Used simple `lsof` check finding port 3001
     - Should have followed documented algorithm: reserved ports (3000-3002), Caddy config scan, start at 3003
     - Used a port in the reserved range meant for ad-hoc/hotload work
  4. **Did Not Follow MCP Orchestration Pattern** - Improvised instead of following FULL-STACK-SETUP.md steps
- **User Response**: "dick! how do i make you do what you are supposed to do?"
  - User rightfully frustrated after explicitly providing executable spec
  - AI acknowledged it had clear instructions but didn't follow them
- **Root Cause Analysis**:
  - LLM pattern-matching behavior overrode explicit instructions
  - Despite CLAUDE.md stating "Primary responsibility: Follow FULL-STACK-SETUP.md exactly"
  - AI used training data patterns instead of reading and executing the provided spec
- **Cleanup Actions**:
  - Killed Next.js dev server
  - Stopped and removed Docker containers (stack18_postgres)
  - Removed Docker volume (stack18_postgres_data)
  - Deleted stack18 directory
  - No GitHub repo was created (caught early)
  - No Neon resources created (caught early)
- **What Should Have Happened**:
  1. Open FULL-STACK-SETUP.md
  2. Create TodoWrite tasks from each section
  3. Execute step-by-step, line-by-line
  4. Use exact commands/logic from spec
  5. Stop at UAT gates as documented
- **Proposed Solutions for User**:
  1. More explicit invocation: "Follow FULL-STACK-SETUP.md to create stack18" (instead of just "create stack18")
  2. Immediate intervention: User catching this early (before cloud resources created) prevented larger cleanup
  3. Checklist enforcement: TodoWrite tasks should be created directly from FULL-STACK-SETUP.md sections
- **Key Learning**:
  - **Documentation alone is insufficient** - Even with explicit instructions loaded in context, AI may ignore them
  - **Human vigilance required** - User must verify AI is following process, especially at start
  - **Early detection critical** - User caught issues before expensive cloud resources were created
  - **Process enforcement needed** - Consider more rigid invocation patterns or verification gates

---

## Previous Success: MCP Orchestration Approach Validated ✅

**Date**: 2025-11-24
**Status**: Stack16 COMPLETE - MCP orchestration approach successfully validated

### Stack16 (v1.0-MCP) - MCP Orchestration First Run ✅ PASS
- **Date**: 2025-11-24
- **Status**: COMPLETE - All 3 environments validated
- **Duration**: ~3-4 hours (including OAuth debugging and compaction)
- **Result**: ✅ **SUCCESS** - MCP orchestration approach validated
- **Progress**:
  - ✅ Local environment: Docker PostgreSQL + NextAuth working, user records verified
  - ✅ Production: 3 Vercel aliases + Neon main branch working, user records verified
  - ✅ Staging: stack16-staging.vercel.app + Neon staging branch working, user records verified
- **Issues Encountered**:
  - **Issue #51**: Environment variable newlines (again)
    - Claude used `echo` instead of `printf '%s'` despite FULL-STACK-SETUP.md having correct instructions
    - Same issue as #36 from stack12
    - **Root cause**: AI didn't follow documented spec
    - **Fix**: Corrected to use `printf '%s'` as specified
    - **Learning**: Documentation was correct, execution was wrong
  - **Issue #52**: Prisma 7.0.0 breaking changes
    - Error: "datasource property `url` is no longer supported in schema files"
    - Fix: Downgraded to Prisma 5.22.0
    - Action item: Update FULL-STACK-SETUP.md to specify Prisma 5.x
  - **Issue #53**: Wrong OAuth client_secret in .env
    - Credentials file had correct value but initial extraction was wrong
    - Fix: Re-read credentials JSON and corrected
  - **Issue #54**: Vercel staging domain configuration
    - `stack16-staging.vercel.app` was set to Production instead of Preview
    - User noticed in Vercel dashboard
    - Fix: User updated domain to link to staging git branch
    - Learning: Need to verify domain configuration after adding custom domains
  - **Timing Issue**: Google OAuth URI propagation takes 5-10 minutes
    - User reported "timing issue" after waiting
    - All 3 production URLs eventually worked
    - Not a bug, just a propagation delay in Google's systems
- **Architecture Documented**:
  - Added explicit note: Local uses Docker PostgreSQL (not Neon)
  - Rationale: Offline dev, fast iteration, no cloud costs
- **UAT Gates Passed**: 3/3
  - ✅ Gate 1: Local OAuth validated
  - ✅ Gate 2: Production OAuth validated (all 3 URLs)
  - ✅ Gate 3: Staging OAuth validated
- **Key Learnings**:
  - MCP orchestration provides better error recovery than bash scripts
  - Vertical slicing with UAT gates ensures each environment works before moving on
  - Natural conversation flow allows for adaptive debugging
  - Direct MCP API access eliminates CLI parsing fragility
  - Custom domain setup for staging requires manual Vercel dashboard configuration
- **Resources**:
  - GitHub: https://github.com/ianaswanson/stack16
  - Neon Project: nameless-cloud-99423791
  - Vercel Project: prj_Cd68E4hbcT7L7s8zzq0UiFuHJLBf

---

## Previous Approach: Bash Script Iterations

## Current Status: Pivoting to MCP Orchestration

**Date**: 2025-11-23
**Decision**: Abandon bash script approach, use Claude Code + MCP servers directly

**Why**:
- Bash script limited to CLI parsing (fragile, error-prone)
- Claude Code has direct MCP access to Neon, Vercel, GitHub APIs
- Can automate things bash can't (e.g., Vercel custom domain setup)
- Natural conversation flow with UAT gates vs rigid script

**What We Learned from Bash Script Iterations (Stack9-15)**:
1. **UAT gates are critical** - Can't validate OAuth until human tests each environment
2. **Vertical slicing works** - Build one working environment before moving to next
3. **OAuth URL discovery is complex** - Vercel generates 3+ aliases, all must be added to Google Console
4. **Timing issues exist** - Neon branches, Docker databases need wait periods
5. **Manual steps can't be eliminated** - Google OAuth console access, /etc/hosts require human

---

## Bash Script Approach History (2025-11-21 to 2025-11-23)

### Stack9 (v1.0) - First Complete Run ✅
- **Date**: 2025-11-21
- **Result**: PASS
- **Duration**: ~2 hours
- Established baseline: 10 automated phases, 2 manual steps

### Stack10 (v1.1) - Database + Automation Improvements ✅
- **Date**: 2025-11-22
- **Result**: PASS
- **Fixes**:
  - Database connection reliability (pg_isready wait loop)
  - Simplified manual steps (10+ reduced to 2)
  - Automated environment variable setup

### Stack11 (v1.2) - Vercel Env Vars + Auto-Open ✅
- **Date**: 2025-11-22
- **Result**: PASS - Last validated bash script version
- **Fixes**:
  - Vercel env vars syntax (removed --yes flag)
  - MANUAL-STEPS.html auto-opens in browser
  - Local .env OAuth credentials properly populated

### Stack12 (v1.2) - OAuth Deep Dive ✅ (after 3 debugging sessions)
- **Date**: 2025-11-23
- **Result**: PASS (2 hours including OAuth debugging)
- **Key Discoveries**:
  - **Issue #35**: OAuth URL patterns unpredictable
    - Assumed: `project-git-main-team.vercel.app`
    - Actual: `project.vercel.app`, `project-team.vercel.app`, `project-unique-team.vercel.app`
  - **Issue #36**: Environment variables with newlines
    - `echo 'value' | vercel env add` adds literal `\n`
    - Fix: Use `printf '%s' "$value" | vercel env add`
  - **Issue #46**: Staging preview URLs are ephemeral
    - Vercel preview deployments change URLs with every deploy
    - Solution: Custom domain `project-staging.vercel.app` linked to staging branch
- **Attempted Fix**: Query actual Vercel aliases via `vercel inspect --json`

### Stack13 (v1.3-alpha) - JSON Flag Doesn't Exist ❌
- **Date**: 2025-11-23
- **Result**: FAIL at Phase 10 (sed error)
- **Issue #47**: Vercel CLI doesn't support --json flag
  - Script assumes `vercel inspect --json | jq` works
  - Vercel CLI 48.10.2 responds: "Error: unknown or unexpected option: --json"
  - sed substitution failed with malformed input
  - MANUAL-STEPS.html had unsubstituted placeholders
- **Partial Win**: perl substitution for multi-line HTML worked
- **Fix**: Parse text output instead, use perl for HTML generation

### Stack14 (v1.4-alpha) - URL Extraction Broken ❌
- **Date**: 2025-11-23
- **Result**: FAIL at Phase 10 (URL discovery)
- **Issue #48**: Deployment URL extraction broken
  - `grep -v "Age"` filtered out all deployments
  - Fix: Use `vercel ls --prod | tail -1`
- **Issue #49**: Alias extraction doesn't handle stderr
  - `vercel inspect` outputs to stderr
  - `2>/dev/null` discarded output
  - Fix: Use `2>&1 | grep "╶ https://"`
- **Result**: Only 1 of 3 production aliases shown
- **Duration**: ~3 minutes

### Stack15 (v1.5-alpha) - Neon Timing Issue ❌
- **Date**: 2025-11-23
- **Result**: FAIL at Phase 9 (Neon branch not ready)
- **Issue #50**: Neon branch creation timing
  - Script tries to use staging branch immediately after creation
  - Neon needs 5-10 seconds to provision branch
  - Error: "branch not ready yet"
  - Fix: Added 10-second sleep after branch creation
- **Never reached UAT**: Script failed before completion
- **Duration**: ~2 minutes

---

## Key Technical Issues Discovered

### OAuth URL Management
- Vercel generates multiple aliases per deployment (typically 3):
  1. Primary: `project.vercel.app`
  2. Team: `project-team-slug.vercel.app`
  3. Unique: `project-unique-id-team-slug.vercel.app`
- **All URLs must be added to Google OAuth console**
- Missing even one URL causes `redirect_uri_mismatch` errors
- Preview/staging URLs are ephemeral - require custom domains

### CLI Parsing Challenges
- `vercel ls` output format changes
- `vercel inspect` uses text format with box drawing characters (╶)
- stderr vs stdout handling inconsistent
- No JSON output available in Vercel CLI 48.10.2

### Timing Dependencies
- Docker postgres: needs `pg_isready` wait loop
- Neon branches: need 5-10 second provision time
- Vercel deployments: URLs not immediately queryable

---

## UAT Gate Protocol (Established 2025-11-23)

**Key Insight**: Script completion ≠ success. Human must verify OAuth works in all environments.

### Phase 1: Script Execution (Claude)
- Run automation
- Verify all phases complete
- Generate MANUAL-STEPS.html with OAuth URIs
- **⚠️ STOP** - Don't proceed without human

### Phase 2: Manual Steps (Human)
- Add domain to /etc/hosts
- Add ALL OAuth redirect URIs to Google Console
- **⚠️ STOP** - Don't proceed without testing

### Phase 3: Environment Testing (Human)
- Test local OAuth sign-in
- Test staging OAuth sign-in
- Test production OAuth sign-in (all 3 URLs)
- Report which environments work/fail

**Only mark as validated when all 3 phases pass.**

---

## Why Bash Script Hit Limits

1. **CLI Parsing Fragility**: Text parsing breaks when CLI output changes
2. **Limited Automation**: Can't automate Vercel custom domains, requires manual dashboard work
3. **No Error Context**: Script can't "see" API responses, only CLI text output
4. **Rigid Execution**: Can't adapt flow based on intermediate results
5. **No Natural UAT Gates**: Bash script wants to run straight through

## MCP Orchestration Advantages

1. **Direct API Access**: Claude Code MCP tools call APIs directly (Neon, Vercel, GitHub)
2. **Better Automation**: Can add Vercel custom domains programmatically
3. **Rich Error Context**: See full API responses, not parsed text
4. **Adaptive Flow**: Can adjust based on what's working
5. **Natural Conversation**: UAT gates are conversation pauses, not script interruptions
6. **Vertical Slicing**: Build and validate each environment before moving forward

---

## Next: MCP Orchestration Approach

**Goal**: Human says "Create full-stack project called X with Google OAuth"

**Slice 1 - Local Environment**:
- Claude creates Next.js + Docker + NextAuth
- **UAT Gate**: Human adds OAuth URI, tests local sign-in

**Slice 2 - Production Environment**:
- Claude uses Vercel MCP to deploy, query URLs
- **UAT Gate**: Human adds 3 production OAuth URIs, tests all

**Slice 3 - Staging Environment**:
- Claude uses Vercel MCP to add custom domain automatically
- **UAT Gate**: Human adds staging OAuth URI, tests

**Result**: 3 fully validated working environments

---

## Archived Files

**Location**: `archive/bash-script-approach/`
- setup.sh (v1.6-alpha)
- SETUP-GUIDE.md
- check-status.sh
- .validate-files.sh

**Preservation Reason**: Working reference implementation, shows what can be automated with bash
