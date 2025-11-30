# Setup Script Version History

## Current Version: v1.6-alpha
**Status**: UNTESTED (pending stack16 validation)
**Last Validated**: v1.2 (stack11, 2025-11-22)

### Changes in v1.6-alpha (from stack15 failure)

**Issue #50: Neon branch creation timing**
- **Problem**: After creating Neon staging branch, script immediately tries to use it before it's provisioned
- **Fixed**: Added 10-second sleep after branch creation to allow Neon to provision branch
- **Location**: setup.sh line 558-560
- **Test**: Verify Phase 9 completes successfully without "branch not ready" errors

### Stack16 Validation Protocol

**PHASE 1: Script Execution (Claude)**

Run `./setup.sh stack16` and verify:

- [ ] Phase 1-9: All complete without errors (especially Phase 9 Neon)
- [ ] Phase 10: Vercel deployment succeeds
- [ ] Phase 10: Script finds deployment URL
- [ ] Phase 10: Script queries and displays 2-3 production URLs
- [ ] MANUAL-STEPS.html: Shows ALL production aliases (3 entries expected)
- [ ] Script completes without errors

**⚠️ STOP - UAT Gate 1: Wait for Human to Complete Manual Steps**

**PHASE 2: Manual Steps (Human)**

- [ ] Human adds domain to /etc/hosts
- [ ] Human opens MANUAL-STEPS.html and copies all OAuth redirect URIs
- [ ] Human adds ALL URIs to Google Cloud Console OAuth client
  - Expected: 5 URIs total (1 local + 1 staging + 3 production aliases)

**⚠️ STOP - UAT Gate 2: Wait for Human to Test All Environments**

**PHASE 3: Environment Testing (Human)**

- [ ] Human tests local: Successfully signed in on http://localhost:PORT
- [ ] Human tests staging: Successfully signed in on staging URL
- [ ] Human tests production (primary): Successfully signed in on https://stackN.vercel.app
- [ ] Human tests production (alias 1): Successfully signed in on team alias
- [ ] Human tests production (alias 2): Successfully signed in on unique alias

**Result**: Can ONLY mark as VALIDATED if all phases pass

### If Stack16 Fails

1. Document failure in ITERATIONS.md using template
2. Add issue to "Changes in v1.7-alpha" section (create above this section)
3. Fix the issue in setup.sh
4. Commit with message: `fix: [description], increment to v1.7-alpha`
5. Run stack17 to test the fix

### If Stack16 Succeeds

1. Document success in ITERATIONS.md (including human UAT results)
2. Update this file:
   - Change status to: `**Status**: VALIDATED (stack16, 2025-11-23)`
   - Update Last Validated to: `v1.6 (stack16, 2025-11-23)`
   - Remove "-alpha" from version number
3. Move "Changes in v1.6" to Version History section below
4. Commit with message: `validate: v1.6 passes all phases (stack16)`

---

## Version History

### v1.5-alpha (Failed: stack15, 2025-11-23)
- Attempted: Fixed deployment URL and alias extraction
- Failed: Neon branch timing issue - branch not ready after creation
- Never validated, superseded by v1.6-alpha

### Changes in v1.5-alpha (from stack14 failure)

**Issue #48: Deployment URL extraction broken**
- **Problem**: `vercel ls --prod | grep -v "Age" | grep -v "URL"` filters out all deployments, returns empty
- **Fixed**: Use `vercel ls --prod | tail -1` to get last line (the deployment URL)
- **Location**: setup.sh line 590
- **Test**: Verify script finds deployment URL and queries aliases successfully

**Issue #49: Alias extraction doesn't handle stderr**
- **Problem**: `vercel inspect` outputs to stderr, but `2>/dev/null` loses output, and awk pattern didn't match
- **Fixed**: Use `2>&1 | grep "╶ https://"` to capture and filter aliases
- **Location**: setup.sh line 608
- **Test**: Verify MANUAL-STEPS.html shows all 3 production aliases

### Stack15 Validation Protocol

**PHASE 1: Script Execution (Claude)**

Run `./setup.sh stack15` and verify:

- [ ] Phase 1-9: All complete without errors
- [ ] Phase 10: Vercel deployment succeeds
- [ ] Phase 10: Script finds deployment URL (shows "✅ Found deployment: https://...")
- [ ] Phase 10: Script queries aliases (shows "Querying deployment aliases...")
- [ ] Phase 10: Script displays 2-3 production URLs
- [ ] MANUAL-STEPS.html: Shows ALL production aliases (3 entries expected)
- [ ] MANUAL-STEPS.html: Each alias has copy button
- [ ] MANUAL-STEPS.html: Staging URL shows custom domain pattern
- [ ] Script completes without errors

**⚠️ STOP - UAT Gate 1: Wait for Human to Complete Manual Steps**

**PHASE 2: Manual Steps (Human)**

- [ ] Human adds domain to /etc/hosts
- [ ] Human opens MANUAL-STEPS.html and copies all OAuth redirect URIs
- [ ] Human adds ALL URIs to Google Cloud Console OAuth client
  - Expected: 5 URIs total (1 local + 1 staging + 3 production aliases)

**⚠️ STOP - UAT Gate 2: Wait for Human to Test All Environments**

**PHASE 3: Environment Testing (Human)**

- [ ] Human tests local: Successfully signed in on http://localhost:PORT
- [ ] Human tests staging: Successfully signed in on staging URL
- [ ] Human tests production (primary): Successfully signed in on https://stackN.vercel.app
- [ ] Human tests production (alias 1): Successfully signed in on team alias
- [ ] Human tests production (alias 2): Successfully signed in on unique alias

**Result**: Can ONLY mark as VALIDATED if all phases pass

### If Stack15 Fails

1. Document failure in ITERATIONS.md using template
2. Add issue to "Changes in v1.6-alpha" section (create above this section)
3. Fix the issue in setup.sh
4. Commit with message: `fix: [description], increment to v1.6-alpha`
5. Run stack16 to test the fix

### If Stack15 Succeeds

1. Document success in ITERATIONS.md
2. Update this file:
   - Change status to: `**Status**: VALIDATED (stack15, 2025-11-23)`
   - Update Last Validated to: `v1.5 (stack15, 2025-11-23)`
   - Remove "-alpha" from version number
3. Move "Changes in v1.5" to Version History section below
4. Commit with message: `validate: v1.5 passes all tests (stack15)`

---

## Version History

### v1.4-alpha (Failed: stack14, 2025-11-23)
- Attempted: Parse vercel inspect text output with awk
- Partial fix: perl substitution worked, but URL extraction failed
- Failed: Deployment URL extraction broken, alias extraction didn't handle stderr
- Never validated, superseded by v1.5-alpha

### Changes in v1.4-alpha (from stack13 failure)

**Issue #47: Vercel CLI --json flag doesn't exist**
- **Problem**: Script tried to use `vercel inspect <url> --json | jq` but Vercel CLI 48.10.2 doesn't support --json flag
- **Fixed**: Parse text output from `vercel inspect` using awk to extract aliases
- **Location**: setup.sh lines 620-655
- **Test**: Verify script successfully queries and displays all production aliases

### Stack14 Validation Checklist

Run `./setup.sh stack14` and verify:

- [ ] Phase 1-9: All complete without errors
- [ ] Phase 10: Vercel deployment succeeds
- [ ] Phase 10: Script queries aliases (shows "Querying deployment aliases...")
- [ ] Phase 10: Script displays 2-3 production URLs (no error messages)
- [ ] Phase 10: No sed errors in output
- [ ] MANUAL-STEPS.html: Shows all production aliases (not placeholders)
- [ ] MANUAL-STEPS.html: Each alias has copy button
- [ ] MANUAL-STEPS.html: Staging URL shows custom domain pattern
- [ ] MANUAL-STEPS.html: Warning about staging domain visible
- [ ] Manual Step 2: Add all OAuth URLs to Google Console
- [ ] OAuth test: Sign in works on local (no redirect_uri_mismatch)
- [ ] OAuth test: Sign in works on production (all aliases work)

### If Stack14 Fails

1. Document failure in ITERATIONS.md using template
2. Add issue to "Changes in v1.5-alpha" section (create above this section)
3. Fix the issue in setup.sh or SETUP-GUIDE.md
4. Commit with message: `fix: [description], increment to v1.5-alpha`
5. Run stack15 to test the fix

### If Stack14 Succeeds

1. Document success in ITERATIONS.md
2. Update this file:
   - Change status to: `**Status**: VALIDATED (stack14, 2025-11-23)`
   - Update Last Validated to: `v1.4 (stack14, 2025-11-23)`
   - Remove "-alpha" from version number
3. Move "Changes in v1.4" to Version History section below
4. Commit with message: `validate: v1.4 passes all tests (stack14)`

---

## Version History

### v1.3-alpha (Failed: stack13, 2025-11-23)
- Attempted: OAuth URL discovery via `vercel inspect --json`
- Failed: --json flag doesn't exist in Vercel CLI
- sed substitution error caused unsubstituted placeholders in MANUAL-STEPS.html
- Never validated, superseded by v1.4-alpha

### Changes in v1.3 (from stack12 learnings)

**Issue #35: OAuth URL assumptions fail**
- **Problem**: Assumed Vercel URL patterns (e.g., `project-git-main-team.vercel.app`) don't match reality
- **Fixed**: Query actual Vercel aliases via `vercel inspect <deployment> --json | jq -r '.alias[]'`
- **Location**: setup.sh lines 582-655
- **Test**: Verify MANUAL-STEPS.html shows 2-3 production URLs (not just 1)

**Issue #37: MANUAL-STEPS.html shows wrong URLs**
- **Problem**: Hardcoded production URL pattern, missing team aliases
- **Fixed**: Generate HTML dynamically from queried aliases array
- **Location**: setup.sh lines 967-1028
- **Test**: Verify copy buttons have all discovered URLs with correct format

**Issue #46: Staging domain requirement undocumented**
- **Problem**: Users don't know preview URLs are ephemeral and OAuth will fail
- **Fixed**: Added warning messages in Phase 10 about custom domain requirement
- **Location**: setup.sh lines 643-655
- **Test**: User sees clear warning about staging custom domain setup

**Documentation: OAuth URL discovery pattern**
- **Added**: Complete section in SETUP-GUIDE.md explaining why assumptions fail
- **Location**: SETUP-GUIDE.md lines 229-289
- **Test**: Fresh reader understands why URL discovery is necessary

### Stack13 Validation Checklist

Run `./setup.sh stack13` and verify:

- [ ] Phase 1-9: All complete without errors
- [ ] Phase 10: Vercel deployment succeeds
- [ ] Phase 10: Script queries aliases (shows "Querying deployment aliases...")
- [ ] Phase 10: Script displays 2-3 production URLs
- [ ] MANUAL-STEPS.html: Shows all production aliases (not just 1)
- [ ] MANUAL-STEPS.html: Each alias has copy button
- [ ] MANUAL-STEPS.html: Staging URL shows custom domain pattern
- [ ] MANUAL-STEPS.html: Warning about staging domain visible
- [ ] Manual Step 2: Add all OAuth URLs to Google Console
- [ ] OAuth test: Sign in works on local (no redirect_uri_mismatch)
- [ ] OAuth test: Sign in works on production (all aliases work)

### If Stack13 Fails

1. Document failure in ITERATIONS.md using template
2. Add issue to "Changes in v1.4" section (create above this section)
3. Fix the issue in setup.sh or SETUP-GUIDE.md
4. Commit with message: `fix: [description], increment to v1.4-alpha`
5. Run stack14 to test the fix

### If Stack13 Succeeds

1. Document success in ITERATIONS.md
2. Update this file:
   - Change status to: `**Status**: VALIDATED (stack13, 2025-11-23)`
   - Update Last Validated to: `v1.3 (stack13, 2025-11-23)`
   - Remove "-alpha" from version number
3. Move "Changes in v1.3" to Version History section below
4. Commit with message: `validate: v1.3 passes all tests (stack13)`

---

## Version History

### v1.2 (Validated: stack11, 2025-11-22)
- Vercel env vars syntax fix (removed --yes flag, split commands)
- Auto-open MANUAL-STEPS.html in browser
- Local .env OAuth credentials properly populated
- Interactive OAuth credential prompts with validation
- All 10 phases completed successfully

### v1.1 (Validated: stack10, 2025-11-22)
- Database connection reliability (pg_isready wait loop)
- Simplified manual steps (10+ reduced to 2)
- sed delimiter fix for NEXTAUTH_SECRET
- Automated environment variable setup

### v1.0 (Initial: stack9, 2025-11-21)
- First complete end-to-end automation
- Next.js 14+ with App Router
- Google OAuth via NextAuth
- PostgreSQL (Docker + Neon)
- Vercel deployment
- GitHub repository creation
