# Stack Validation

Full-stack Next.js project setup automation with OAuth across multiple environments (local, staging, production).

## Quick Start

**To create a new full-stack project:**

Tell Claude Code: "Create full-stack project called [project-name] with Google OAuth"

Claude will follow the instructions in `FULL-STACK-SETUP.md` to create:
- ✅ Local development (Docker PostgreSQL)
- ✅ Staging environment (Neon database, Vercel preview)
- ✅ Production environment (Neon database, Vercel production)
- ✅ Google OAuth configured for all environments
- ✅ Developer bypass for local/staging

## Documentation

### Core Setup
- **[FULL-STACK-SETUP.md](./FULL-STACK-SETUP.md)** - Complete executable instructions for creating full-stack projects
- **[CLAUDE.md](./CLAUDE.md)** - Context and instructions for AI agents

### Workflows
- **[docs/selective-database-branching.md](./docs/selective-database-branching.md)** - How to create isolated database branches for feature development

### Project Context
- **[LOG.md](./LOG.md)** - Iteration history and learnings from stack1-stack20
- **[STATUS.md](./STATUS.md)** - Current project status

### Reference
- **[docs/vercel-staging-url-findings.md](./docs/vercel-staging-url-findings.md)** - Technical details on Vercel preview URLs
- **[archive/](./archive/)** - Previous bash script approach (deprecated)

## Templates

Reusable Next.js + NextAuth components:

- **`templates/auth/login-page.tsx`** - Mobbin-style login with Google OAuth + dev bypass
- **`templates/auth/dashboard-page.tsx`** - Protected dashboard with sign-out in header
- **`templates/auth/session-provider.tsx`** - NextAuth SessionProvider wrapper
- **`templates/components/google-logo.tsx`** - Official Google brand logo

All templates use Claudian design system tokens (no hardcoded values).

## Tech Stack

**Required (Tier 1):**
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS + Claudian design system
- PostgreSQL (Docker local, Neon cloud)
- Prisma 5.x
- NextAuth.js
- Vercel (hosting)

**Architecture:**
- **Local**: Docker PostgreSQL, npm dev server, .test domain via Caddy
- **Staging**: Neon branch, Vercel preview, custom domain (app-staging.domain.com)
- **Production**: Neon main, Vercel production, custom domain (app.domain.com)

## Key Features

### Multi-Environment OAuth
- **Production**: Google OAuth only
- **Staging**: Google OAuth + Developer Bypass
- **Local**: Google OAuth + Developer Bypass

### Selective Database Branching
- Default: All feature branches share staging database
- Optional: Create isolated Neon branch for risky changes (migrations, schema experiments)
- See [selective-database-branching.md](./docs/selective-database-branching.md)

### MCP-Based Automation
- Uses Neon MCP server for database operations
- Uses Vercel CLI for deployments
- No bash scripts - Claude Code orchestrates everything

## Example Projects

This repo has been validated through 20 iterations (stack1-stack20):
- **stack20**: Latest validation (aws-us-west-2)
- Full iteration history in [LOG.md](./LOG.md)

## Development Workflow

### Initial Setup
```bash
# Clone this repo
git clone https://github.com/ianaswanson/stack-validation.git

# Tell Claude Code to create a project
"Create full-stack project called my-app with Google OAuth"
```

### Feature Development
```bash
# Default (share staging DB)
git checkout -b feature/new-button
git push origin feature/new-button
# Vercel auto-deploys preview with staging DB

# With isolated DB (for schema changes)
"Create isolated database for feature-risky-migration"
# Claude creates Neon branch, configures Vercel
```

### Deployment
- **Staging**: Push to `staging` branch → auto-deploys
- **Production**: Push to `main` branch → auto-deploys

## Contributing

This is an internal Claudian utility. Improvements welcome:
1. Test the setup process
2. Document issues in LOG.md
3. Update FULL-STACK-SETUP.md with fixes
4. Validate with a new stack iteration

## Support

- Check [LOG.md](./LOG.md) for known issues and solutions
- Review [FULL-STACK-SETUP.md](./FULL-STACK-SETUP.md) error handling section
- For Neon issues: https://neon.tech/docs
- For Vercel issues: https://vercel.com/docs

---

**Repository**: https://github.com/ianaswanson/stack-validation
**Last Updated**: 2025-11-30
**Status**: Active - validated through stack20
