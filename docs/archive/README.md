# Full-Stack Setup Automation

**Automated Next.js + NextAuth + Prisma + Neon + Vercel project creation.**

Creates production-ready full-stack applications in ~3 minutes (vs 2-3 hours manual setup).

---

## Quick Start

```bash
# 1. Get Google OAuth credentials JSON file
# Download from: https://console.cloud.google.com/apis/credentials

# 2. Run setup
./setup.sh my-project /path/to/google-oauth.json

# 3. Complete 2 manual steps (opens in browser)
# - Add domain to /etc/hosts
# - Update Google OAuth redirect URIs
```

**That's it.** Your app is deployed and running.

---

## What You Get

- **Next.js 14+** with TypeScript, Tailwind, App Router
- **Google OAuth** (NextAuth.js)
- **PostgreSQL** databases (Docker local + Neon production/staging)
- **Vercel deployment** (production + staging URLs)
- **GitHub repository** with proper branch structure
- **All environment variables** automatically configured

**Time**: ~5 minutes total (3 min automated + 2 min manual steps)

---

## Documentation

- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Complete usage instructions (read this first)
- **[CLAUDE.md](CLAUDE.md)** - Meta-context for Claude Code (building vs using)
- **setup.sh** - The automation script
- **docs/archive/** - Historical iteration logs (optional reading)

---

## Files Structure

```
stack-validation/
├── setup.sh                      # Main automation script
├── SETUP-GUIDE.md                # How to use the system
├── CLAUDE.md                     # Meta-context (iteration vs execution)
├── README.md                     # This file
└── docs/
    └── archive/
        ├── STATUS.md             # Iteration history (stack1-9)
        └── VALIDATED-WORKFLOW.md # Manual workflow reference
```

**After running setup.sh, you get**:
```
your-project/
├── MANUAL-STEPS.html  # 2 steps to complete setup
└── ... (full Next.js app)
```

---

## Prerequisites

- Node.js 18+
- Docker Desktop
- Authenticated CLI tools:
  - `vercel login`
  - `neonctl auth`
  - `gh auth login`
- Google OAuth credentials JSON file

See [SETUP-GUIDE.md](SETUP-GUIDE.md) for details.

---

**Status**: Validated through stack9 (2025-11-22)
