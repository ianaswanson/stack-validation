# Stack Validation Iterations Log

**Purpose**: Append-only record of every test run. Never delete entries.

**How to use**: After running `./setup.sh stackN`, copy the template below and fill it out.

---

## Template (Copy This for Each Iteration)

```markdown
## StackN - YYYY-MM-DD

**Version Tested**: vX.Y-alpha
**Result**: ✅ PASS / ❌ FAIL at [Phase/UAT]
**Duration**: X minutes (script) + Y minutes (UAT)

### Script Execution Checklist
- [ ] Phase 1: Next.js project
- [ ] Phase 2: Dependencies
- [ ] Phase 3: Package configuration
- [ ] Phase 4: Docker database
- [ ] Phase 5: Prisma setup
- [ ] Phase 6: NextAuth configuration
- [ ] Phase 7: GitHub repository
- [ ] Phase 8: Staging branch
- [ ] Phase 9: Neon database
- [ ] Phase 10: Vercel deployment
- [ ] MANUAL-STEPS.html generated correctly (all aliases shown)
- [ ] Script completed without errors

### UAT Gate 1: Manual Steps Completion (HUMAN)
**STOP HERE - Wait for human to complete these steps**

- [ ] Human completed: Add domain to /etc/hosts
- [ ] Human completed: Add ALL OAuth redirect URIs to Google Cloud Console
  - [ ] Local: http://localhost:PORT/api/auth/callback/google
  - [ ] Staging: https://project-staging.vercel.app/api/auth/callback/google
  - [ ] Production (primary): https://project.vercel.app/api/auth/callback/google
  - [ ] Production (team): https://project-TEAM.vercel.app/api/auth/callback/google
  - [ ] Production (unique): https://project-UNIQUE-TEAM.vercel.app/api/auth/callback/google

### UAT Gate 2: Environment Verification (HUMAN)
**STOP HERE - Wait for human to test and report results**

- [ ] **Local OAuth Test**: Human successfully signed in with Google on http://localhost:PORT
  - Result: ✅ PASS / ❌ FAIL
  - If fail: Error message: _______________

- [ ] **Staging OAuth Test**: Human successfully signed in with Google on staging URL
  - Result: ✅ PASS / ❌ FAIL
  - If fail: Error message: _______________

- [ ] **Production OAuth Test (Primary)**: Human successfully signed in on https://project.vercel.app
  - Result: ✅ PASS / ❌ FAIL
  - If fail: Error message: _______________

- [ ] **Production OAuth Test (Alias 1)**: Human successfully signed in on team alias
  - Result: ✅ PASS / ❌ FAIL
  - If fail: Error message: _______________

- [ ] **Production OAuth Test (Alias 2)**: Human successfully signed in on unique alias
  - Result: ✅ PASS / ❌ FAIL
  - If fail: Error message: _______________

### Issues Found (if any)
**Issue #N**: Short description
- Symptom: What the human/script saw
- Root cause: Why it happened
- Location: setup.sh:LINE or other file
- Fix: What was changed

(repeat for each issue)

### Files Modified
- file:LINE-LINE (description of change)

### Version Decision
**IMPORTANT**: Can only mark as VALIDATED if ALL UAT gates passed

- [ ] Mark vX.Y as VALIDATED (all script phases + all UAT gates passed)
- [ ] Increment to vX.Y+1-alpha (any failure in script or UAT)

### Next Action
Next steps based on result

---
```

---

## Stack12 - 2025-11-23

**Version Tested**: v1.2
**Result**: ✅ PASS (all 4 phases complete)
**Duration**: ~2 hours (including 3 OAuth debugging sessions)

### Checklist Results
- [x] Phase 1: Next.js project
- [x] Phase 2: Dependencies
- [x] Phase 3: Package configuration
- [x] Phase 4: Docker database
- [x] Phase 5: Prisma setup
- [x] Phase 6: NextAuth configuration
- [x] Phase 7: GitHub repository
- [x] Phase 8: Staging branch
- [x] Phase 9: Neon database (via MCP - first successful MCP-only setup)
- [x] Phase 10: Vercel deployment
- [x] Phase 4 (staging): Neon staging branch
- [x] Phase 4 (staging): Custom staging domain
- [x] Phase 4 (staging): OAuth working on all 3 environments

### Issues Found

**Issue #1: OAuth URL assumptions wrong**
- Symptom: `redirect_uri_mismatch` errors during sign-in
- Root cause: Script assumed URL pattern `stack12-git-main-ian-swansons-projects.vercel.app` but actual URLs were `stack12.vercel.app`, `stack12-ian-swansons-projects.vercel.app`, `stack12-ian-5012-ian-swansons-projects.vercel.app`
- Location: setup.sh Phase 10 (was constructing URLs instead of querying)
- Fix: Added `vercel inspect` query to get actual alias array
- Time wasted: ~30 minutes debugging

**Issue #2: Environment variables with newlines**
- Symptom: OAuth `Error 401: invalid_client` on staging
- Root cause: `echo 'value' | vercel env add` adds literal `\n` to end of value
- Location: setup.sh Phase 10 environment variable section
- Fix: Changed to `printf '%s' "$value" | vercel env add`
- Time wasted: ~15 minutes debugging

**Issue #3: Staging preview URLs are ephemeral**
- Symptom: Preview URLs change with every deployment (e.g., `stack12-abc123.vercel.app`)
- Root cause: Vercel preview deployments get unique URLs per deployment
- Impact: OAuth redirect URIs would break with every deploy
- Fix: Added custom domain `stack12-staging.vercel.app` linked to staging branch
- Documentation: Added to SETUP-GUIDE.md and warning in setup.sh

### Files Modified
- setup.sh:582-655 (OAuth URL discovery via vercel inspect)
- setup.sh:643-655 (staging custom domain documentation/warnings)
- setup.sh:967-1028 (dynamic MANUAL-STEPS.html generation)
- SETUP-GUIDE.md:229-289 (OAuth URL discovery pattern section)
- SETUP-GUIDE.md:303-318 (updated manual step 2 with multiple URLs)
- CLAUDE.md:51-90 (iteration status update)

### Documentation Created
⚠️ **WRONG APPROACH** - Created 5 separate docs/stack12-*.md files:
- docs/stack12-session-summary.md
- docs/stack12-env-var-bug-findings.md
- docs/stack12-phase4-complete.md
- docs/stack12-phase4-staging-setup.md
- docs/vercel-staging-url-findings.md

**Lesson learned**: Should have appended to ITERATIONS.md instead. These files will be consolidated and deleted.

### Infrastructure Created (then cleaned up)
- Neon project: snowy-poetry-33355597 (deleted)
- Vercel project: stack12 (deleted)
- GitHub repo: ianaswanson/stack12 (deleted)
- Docker container: stack12-postgres (deleted)
- Local directory: stack11/stack12 (deleted)

### Version Decision
- [x] Increment to v1.3-alpha (OAuth URL discovery improvements)
- [ ] v1.2 remains last validated version

### Next Action
Run stack13 to test v1.3 OAuth URL discovery improvements

---

## Stack11 - 2025-11-22

**Version Tested**: v1.2-alpha
**Result**: ✅ PASS
**Duration**: ~1 hour

### Checklist Results
- [x] All 10 phases completed
- [x] Vercel env vars set automatically
- [x] MANUAL-STEPS.html auto-opens in browser

### Issues Found
None - all improvements from stack10 validated successfully

### Files Modified
- None (validation only)

### Version Decision
- [x] Mark v1.2 as VALIDATED

### Next Action
Begin stack12 iteration to add staging environment (Phase 4)

---

## Stack10 - 2025-11-22

**Version Tested**: v1.1
**Result**: ✅ PASS
**Duration**: ~1 hour

### Issues Found
**Issue: Vercel env vars command syntax**
- Symptom: Environment variables not set in Vercel
- Root cause: `vercel env add --yes` flag doesn't exist
- Fix: Removed `--yes` flag, split multi-environment calls
- Location: setup.sh Phase 10

**Issue: OAuth credentials not in local .env**
- Symptom: Local development had empty GOOGLE_CLIENT_ID
- Root cause: Script loaded credentials but didn't write to .env
- Fix: Added write to .env file after credential loading
- Location: setup.sh early sections

### Version Decision
- [x] Mark v1.1 as VALIDATED
- [x] Increment to v1.2-alpha for auto-open improvement

---

## Stack15 - 2025-11-23

**Version Tested**: v1.5-alpha
**Result**: ❌ FAIL at Phase 9 (Neon database - timing issue)
**Duration**: ~2 minutes (script) + 0 minutes (UAT - not reached)

### Script Execution Checklist
- [x] Phase 1: Next.js project
- [x] Phase 2: Dependencies
- [x] Phase 3: Package configuration
- [x] Phase 4: Docker database
- [x] Phase 5: Prisma setup
- [x] Phase 6: NextAuth configuration
- [x] Phase 7: GitHub repository
- [x] Phase 8: Staging branch
- [ ] Phase 9: Neon database (FAILED - "ERROR: branch not ready yet")
- [ ] Phase 10: Vercel deployment (NOT REACHED)
- [ ] MANUAL-STEPS.html generated (NOT REACHED)
- [ ] Script completed without errors (FAILED)

### UAT Gate 1: Manual Steps Completion (HUMAN)
**NOT REACHED** - Script failed before completion

### UAT Gate 2: Environment Verification (HUMAN)
**NOT REACHED** - Script failed before completion

### Issues Found

**Issue #50: Neon branch creation timing**
- Symptom: Script shows "ERROR: branch not ready yet" during Phase 9
- Root cause: After creating Neon staging branch, script immediately tries to use it before Neon provisions it
  - Neon branches take a few seconds to become ready
  - No wait/retry logic after branch creation
- Impact: Script fails, no infrastructure completed
- Location: setup.sh Phase 9 (Neon database section)
- Fix needed: Add wait loop after branch creation (similar to pg_isready pattern for Docker)
  - Query branch status until ready
  - Or add simple 5-10 second sleep after neonctl branches create
- Time wasted: ~5 minutes investigating

### Infrastructure Created (needs cleanup)
- Neon project: summer-violet-80833311 (partially created, DELETE)
- Vercel project: NOT CREATED
- GitHub repo: ianaswanson/stack15 (DELETE)
- Docker container: stack15-postgres (DELETE)
- Local directory: /Users/ianswanson/ai-dev/claudian/utilities/stack-validation/stack15 (DELETE)

### Files Modified
None - need to add Neon branch wait logic

### Version Decision
- [ ] Mark v1.5 as VALIDATED (FAIL - script execution failed)
- [x] Increment to v1.6-alpha with fix for Issue #50
- [ ] v1.2 remains last validated version

### Next Action
1. Update VERSION.md to v1.6-alpha with Neon timing fix
2. Add wait logic after Neon branch creation in setup.sh
3. Clean up stack15 infrastructure
4. Run stack16 to test fix

---

## Stack14 - 2025-11-23

**Version Tested**: v1.4-alpha
**Result**: ❌ FAIL at Phase 10 (Vercel deployment - URL discovery)
**Duration**: ~3 minutes

### Checklist Results
- [x] Phase 1: Next.js project
- [x] Phase 2: Dependencies
- [x] Phase 3: Package configuration
- [x] Phase 4: Docker database
- [x] Phase 5: Prisma setup
- [x] Phase 6: NextAuth configuration
- [x] Phase 7: GitHub repository
- [x] Phase 8: Staging branch
- [x] Phase 9: Neon database
- [x] Phase 10: Vercel deployment (deployments succeeded)
- [ ] Phase 10: Vercel URL discovery (FAILED - script showed "Could not query deployment")
- [x] MANUAL-STEPS.html: Generated with proper HTML formatting (perl fix worked!)
- [ ] MANUAL-STEPS.html: Only shows 1 production alias (should show 3)
- [ ] Manual Step 1: /etc/hosts (NOT TESTED)
- [ ] Manual Step 2: OAuth redirect URIs (NOT TESTED - missing 2 aliases)

### Issues Found

**Issue #48: Deployment URL extraction broken**
- Symptom: Script shows "⚠️  Could not query deployment. Using default URL pattern."
- Root cause: Command `vercel ls --prod | grep -v "Age" | grep -v "URL" | head -1 | awk '{print $2}'` filters out all output
  - The grep filters are too aggressive and remove all deployment lines
  - Result: DEPLOYMENT_URL is empty, script falls back to default pattern
- Impact: Script never queries actual deployment, missing 2 additional aliases
- Location: setup.sh:590
- Actual aliases (discovered manually):
  - https://stack14.vercel.app (shown in MANUAL-STEPS.html)
  - https://stack14-ian-swansons-projects.vercel.app (MISSING)
  - https://stack14-ian-5012-ian-swansons-projects.vercel.app (MISSING)
- Fix: Use `vercel ls --prod | tail -1` to get last line (which is the deployment URL)
- Time wasted: ~10 minutes investigating

**Issue #49: Alias extraction doesn't handle stderr**
- Symptom: Even with correct deployment URL, no aliases extracted
- Root cause: `vercel inspect` outputs to stderr, but script uses `2>/dev/null` which discards output
  - Original awk pattern also didn't match the box drawing character correctly
- Impact: PRODUCTION_ALIASES array remains empty, falls back to single default URL
- Location: setup.sh:608
- Fix: Use `2>&1 | grep "╶ https://" | awk '{print $2}'` to:
  - Capture stderr with 2>&1
  - Use simple grep instead of complex awk range pattern
- Time wasted: ~10 minutes testing

### Successful Changes (v1.4-alpha partial)
- ✅ perl substitution for multi-line HTML works perfectly
- ✅ MANUAL-STEPS.html has proper formatting (no placeholders)
- ✅ Script completes without sed errors

### Infrastructure Created (needs cleanup)
- Neon project: proud-sky-03653218 (DELETE)
- Vercel project: stack14 (DELETE)
- GitHub repo: ianaswanson/stack14 (DELETE)
- Docker container: stack14-postgres (DELETE)
- Local directory: /Users/ianswanson/ai-dev/claudian/utilities/stack-validation/stack14 (DELETE)

### Files Modified
- setup.sh:590 (fixed DEPLOYMENT_URL extraction with tail -1)
- setup.sh:608 (fixed alias extraction with 2>&1 and grep)

### Version Decision
- [ ] Mark v1.4 as VALIDATED (FAIL - URL discovery broken)
- [x] Increment to v1.5-alpha with fixes for Issues #48 and #49
- [ ] v1.2 remains last validated version

### Next Action
1. Run stack15 to test v1.5-alpha fixes
2. Expect to see 3 production aliases in MANUAL-STEPS.html

---

## Stack13 - 2025-11-23

**Version Tested**: v1.3-alpha
**Result**: ❌ FAIL at Phase 10 (Vercel deployment)
**Duration**: ~3 minutes (script stopped at sed error)

### Checklist Results
- [x] Phase 1: Next.js project
- [x] Phase 2: Dependencies
- [x] Phase 3: Package configuration
- [x] Phase 4: Docker database
- [x] Phase 5: Prisma setup
- [x] Phase 6: NextAuth configuration
- [x] Phase 7: GitHub repository
- [x] Phase 8: Staging branch
- [x] Phase 9: Neon database
- [x] Phase 10: Vercel deployment (partially - deployments succeeded)
- [ ] Phase 10: Vercel URL discovery (FAILED)
- [ ] MANUAL-STEPS.html: Generated correctly (FAILED - has unsubstituted placeholders)
- [ ] Manual Step 1: /etc/hosts (NOT TESTED - blocked by Phase 10 failure)
- [ ] Manual Step 2: OAuth redirect URIs (NOT TESTED - blocked by Phase 10 failure)

### Issues Found

**Issue #47: Vercel CLI doesn't support --json flag**
- Symptom: Script shows "Could not query deployment. Using default URL pattern." then fails with `sed: 1: "s|PRODUCTION_ALIASES_SE ...": unescaped newline inside substitute pattern`
- Root cause: Script assumes `vercel inspect --json` exists, but Vercel CLI 48.10.2 responds with "Error: unknown or unexpected option: --json"
- Impact:
  - URL query returns empty/invalid value
  - sed substitution fails with malformed input
  - MANUAL-STEPS.html has unsubstituted placeholders: `PRODUCTION_ALIASES_SECTION` (line 180) and `https://stack13.vercel.appS_LIST` (line 193)
  - Script exits with code 1
- Location: setup.sh:~620-655 (Vercel URL discovery section)
- Actual aliases (discovered manually via `vercel inspect` text output):
  - https://stack13.vercel.app
  - https://stack13-ian-swansons-projects.vercel.app
  - https://stack13-ian-5012-ian-swansons-projects.vercel.app
- Fix needed: Parse text output of `vercel inspect` instead of using non-existent --json flag
  - Extract aliases from "Aliases" section using grep/awk/sed
  - Format: Lines starting with `╶ https://` under "Aliases" header
- Time wasted: ~15 minutes investigating

### Vercel Inspect Output Format (for reference)

Text output structure:
```
Aliases

  ╶ https://stack13.vercel.app
  ╶ https://stack13-ian-swansons-projects.vercel.app
  ╶ https://stack13-ian-5012-ian-swansons-projects.vercel.app
```

Suggested parsing approach:
```bash
vercel inspect <url> | awk '/Aliases/,/^$/ {if ($1 == "╶") print $2}'
```

### Infrastructure Created (needs cleanup)
- Neon project: twilight-band-06649917 (DELETE)
- Vercel project: stack13 (DELETE)
- GitHub repo: ianaswanson/stack13 (DELETE)
- Docker container: stack13-postgres (DELETE)
- Local directory: /Users/ianswanson/ai-dev/claudian/utilities/stack-validation/stack13 (DELETE)

### Files Modified (attempted in v1.3-alpha)
- setup.sh:582-655 (OAuth URL discovery via vercel inspect --json - BROKEN)
- setup.sh:643-655 (staging custom domain warnings)
- setup.sh:967-1028 (dynamic MANUAL-STEPS.html generation with sed - BROKEN)

### Version Decision
- [ ] Mark v1.3 as VALIDATED (FAIL - critical bug found)
- [x] Increment to v1.4-alpha with fix for Vercel CLI JSON flag issue
- [ ] v1.2 remains last validated version

### Next Action
1. Update VERSION.md to v1.4-alpha with Issue #47 fix
2. Fix setup.sh to parse text output from `vercel inspect`
3. Test fix with stack14

---

## Stack9 - 2025-11-21

**Version Tested**: v1.0
**Result**: ✅ PASS
**Duration**: ~2 hours

### Notes
First complete end-to-end validation. Established baseline for all future improvements.

---
