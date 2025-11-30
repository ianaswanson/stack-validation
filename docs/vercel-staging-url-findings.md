# Vercel Staging Environment URL Findings

**Date**: 2025-11-23
**Context**: Stack12 Phase 4 - Setting up staging environment
**Issue**: Discovered that preview deployment URLs are ephemeral and unsuitable for OAuth

---

## The Problem

When setting up a staging environment on Vercel using a Git branch (`staging`), preview deployments receive **ephemeral URLs** that change with every deployment.

**What we observed:**
- Created `staging` Git branch
- Deployed to Vercel
- Received URL: `stack12-brhjz4kq7-ian-swansons-projects.vercel.app` (contains deployment hash)
- Alias: `stack12-ian-5012-ian-swansons-projects.vercel.app` (shared with production)

**The issue:**
- Deployment hash URLs change every deployment
- Aliases get reassigned to the latest deployment (production OR staging, whichever is newest)
- OAuth requires stable, predictable URLs
- Can't use ephemeral URLs for OAuth configuration

---

## Research Findings

### Source: Vercel Staging Guide
URL: https://vercel.com/guides/set-up-a-staging-environment-on-vercel

**Key insights:**

1. **Preview deployments are ephemeral by design**
   - Each deployment gets a unique URL with a hash
   - URLs change on every deployment
   - Not suitable for OAuth or webhooks

2. **Stable staging URLs require custom domains**
   - Navigate to Project Settings > Domains
   - Add a custom domain (can use free `*.vercel.app` subdomain)
   - Manually assign domain to staging branch (it defaults to production branch)
   - This provides a stable, permanent URL for the staging environment

3. **Environment variables can be branch-scoped**
   - ✅ Variables can be scoped to specific branches
   - ✅ Branch-specific variables override defaults
   - ✅ Only need to define values that differ from production
   - ⚠️  Must redeploy after adding variables

4. **Two approaches for staging:**
   - **Custom Environments** (Pro/Enterprise): Dedicated staging with branch rules
   - **Branch-based** (All plans): Use custom domain + branch-scoped env vars

---

## Solution for OAuth-Compatible Staging

### Incorrect Approach (What we almost did)
❌ Use ephemeral preview URLs for OAuth
❌ Update OAuth redirect URIs every deployment
❌ Use shared aliases that switch between prod/staging

### Correct Approach
✅ Add custom domain for staging (e.g., `stack12-staging.vercel.app`)
✅ Assign domain to `staging` branch permanently
✅ Use stable domain for OAuth configuration
✅ Add branch-scoped environment variables
✅ Configure OAuth once with stable URL

---

## Implementation Steps

**For setup.sh automation:**

1. Create staging Git branch
2. Deploy staging branch to Vercel
3. **Add custom staging domain** via Vercel project settings
   - Can use pattern: `{project}-staging.vercel.app`
   - Must manually assign to staging branch
4. Query actual staging domain via Vercel MCP
5. Add branch-scoped environment variables (pointing to Neon staging branch)
6. Configure OAuth with stable staging domain
7. Redeploy to activate env vars

**Critical:** Custom domain assignment must happen BEFORE OAuth configuration, not after.

---

## Impact on Stack12

**What we caught:**
- About to configure OAuth with ephemeral URLs
- Would have resulted in broken OAuth after every deployment
- Groundhog day problem #2 (after the production OAuth URL issue)

**Action taken:**
- Stopped Phase 4.4 (environment variable configuration)
- Researched proper staging setup
- Documented findings before proceeding
- Will add custom staging domain before continuing

---

## Future Setup.sh Improvements

**Add to OAuth improvement task (stack-validation-34):**
- Document that staging requires custom domain for OAuth
- Add step to create custom staging domain
- Query actual domain via Vercel MCP after assignment
- Generate OAuth URLs from queried domain (not assumed pattern)

**New validation criterion:**
- Staging setup must include custom domain creation
- Verify domain is stable across redeployments
- Test OAuth with staging domain

---

## References

- **Vercel Staging Guide**: https://vercel.com/guides/set-up-a-staging-environment-on-vercel
- **Stack12 Session**: docs/stack12-session-summary.md
- **Related Issue**: OAuth URL discovery (stack-validation-34)

---

**Key Takeaway**: Preview deployments (Git branches) are ephemeral by design. Staging environments that need stable URLs (for OAuth, webhooks, etc.) MUST use custom domains assigned to the staging branch.

**Status**: Findings captured, implementation paused at Phase 4.3, proceeding with custom domain addition.
