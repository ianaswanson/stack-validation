# Selective Database Branching

## Philosophy

**Not every feature branch needs its own database.** Create Neon branches selectively when you need database isolation.

## When to Create a Database Branch

✅ **Create Neon branch for:**
- Schema changes / Prisma migrations
- Seeding large amounts of test data
- Breaking database changes
- Testing rollback scenarios
- Experimenting with database structure
- Testing data-heavy features that could pollute staging

❌ **Skip Neon branch for:**
- UI/frontend changes
- Adding routes/pages
- Styling updates
- Business logic that doesn't touch schema
- Bug fixes that don't change data model
- Read-only features

## Default Behavior

All Vercel preview deployments use the **staging Neon branch** by default:
- Environment: `NEXT_PUBLIC_VERCEL_ENV=preview`
- Database: Staging Neon branch (shared across all previews)
- OAuth: Developer bypass enabled

## Workflow with Claude Code (Recommended)

**Tell Claude:** "Create isolated database for feature-xyz"

Claude will use MCP tools to:
1. Create Neon branch (via MCP)
2. Wait for provisioning
3. Get connection string (via MCP)
4. Push Prisma schema
5. Provide Vercel configuration steps

## Manual Workflow (If Needed)

### Step 1: Create Neon Branch

```bash
neonctl branches create \
  --project-id PROJECT_ID \
  --name feature-your-feature-name \
  --output json
```

**Save the branch ID** from the response.

### Step 2: Wait for Provisioning

```bash
sleep 10
```

Neon branches take 5-10 seconds to become ready.

### Step 3: Get Connection String

```bash
neonctl connection-string \
  --project-id PROJECT_ID \
  --branch-id br-your-branch-id
```

**Copy the connection string.**

### Step 4: Push Schema to Feature Branch

```bash
DATABASE_URL="your-neon-branch-connection-string" npx prisma db push
```

### Step 5: Deploy Feature Branch

```bash
git push origin feature/your-feature-name
```

Vercel will auto-create a preview deployment.

### Step 6: Set DATABASE_URL for Preview

**Option A: Set for all preview deployments** (affects other feature branches):
```bash
printf '%s' "your-neon-branch-connection-string" | vercel env add DATABASE_URL preview
```

**Option B: Set for specific deployment** (recommended):

Go to Vercel Dashboard:
1. Find your preview deployment
2. Go to Settings → Environment Variables
3. Add `DATABASE_URL` with your Neon branch connection string
4. Scope: Only this deployment
5. Redeploy

### Step 7: Redeploy to Pick Up New DATABASE_URL

```bash
vercel redeploy DEPLOYMENT_URL
```

### Step 8: Clean Up After PR Merges

```bash
neonctl branches delete br-your-branch-id --project-id PROJECT_ID
```

## Automated Workflow (Claude Code with MCP)

When Claude Code has Neon MCP server configured, it can automate the entire workflow:

**User says:** "Create isolated database for feature-add-user-roles"

**Claude does:**
1. Uses `mcp__Neon__create_branch` to create Neon branch
2. Waits 10 seconds for provisioning
3. Uses `mcp__Neon__get_connection_string` to get connection string
4. Runs `npx prisma db push` with the new connection string
5. Provides clear Vercel configuration instructions

**No bash scripts needed** - Claude orchestrates everything via MCP tools.

## Example: Risky Migration Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-user-roles

# 2. Make Prisma schema changes
# Edit prisma/schema.prisma

# 3. Create isolated database branch
./create-db-branch.sh add-user-roles

# 4. Test migration on feature branch
DATABASE_URL="<printed-connection-string>" npx prisma migrate dev

# 5. Push to GitHub (triggers Vercel preview)
git push origin feature/add-user-roles

# 6. Set DATABASE_URL in Vercel (manual or via dashboard)
# Follow instructions printed by create-db-branch.sh

# 7. Test on preview deployment
# Visit stack20-abc123.vercel.app

# 8. Merge PR when ready
# GitHub merges to main

# 9. Clean up Neon branch
neonctl branches delete br-add-user-roles-xyz --project-id PROJECT_ID
```

## Project-Specific Configuration

For stack20:
- **Project ID**: `royal-bar-19096622`
- **Region**: `aws-us-west-2`
- **Staging Branch**: `br-empty-pine-afo8ov49`
- **Production Branch**: Main branch (default)

## Vercel Environment Variables by Environment

| Environment | DATABASE_URL Points To | NEXT_PUBLIC_VERCEL_ENV | OAuth |
|-------------|------------------------|------------------------|-------|
| Production  | Neon main branch       | production             | Real only |
| Staging     | Neon staging branch    | preview                | Real + Bypass |
| Preview (default) | Neon staging branch | preview          | Real + Bypass |
| Preview (isolated) | Neon feature branch | preview         | Real + Bypass |

## Best Practices

1. **Name branches consistently**: `feature-<description>` matches Git branch name
2. **Delete old branches**: Clean up Neon branches when PRs merge
3. **Document in PR**: Note if the PR uses an isolated database branch
4. **Test locally first**: Use Docker PostgreSQL for initial development
5. **Only create when needed**: Default to shared staging database

## Troubleshooting

### Preview deployment shows wrong data
- Check which DATABASE_URL the deployment is using
- Verify Neon branch exists and is ready
- Check environment variable scope (all previews vs specific deployment)

### Schema out of sync
- Run `npx prisma db push` against the feature branch
- Verify you're using the correct connection string

### Branch won't delete
- Check if any deployments are still using it
- Wait a few minutes and retry
- Use `--force` flag if safe

## Future Automation Ideas

- GitHub Action to auto-create Neon branch on PR open
- Auto-delete Neon branch on PR close
- Slack notification when feature branch database is ready
- Cost tracking for long-running feature branches

---

**Last Updated**: 2025-11-30
**Related**: FULL-STACK-SETUP.md, create-db-branch.sh
