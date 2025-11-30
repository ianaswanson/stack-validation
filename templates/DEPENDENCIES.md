# Dependencies for Terms of Service Implementation

## Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "react-markdown": "^9.0.1"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

## Installation Commands

```bash
# Using npm
npm install react-markdown
npm install -D tsx

# Using pnpm
pnpm add react-markdown
pnpm add -D tsx

# Using yarn
yarn add react-markdown
yarn add -D tsx
```

## Dependency Details

### react-markdown
- **Purpose:** Renders the terms of service markdown content
- **Used in:** `components/terms/TermsDisplay.tsx`
- **Version:** 9.0.1 or later
- **License:** MIT

### tsx
- **Purpose:** Runs TypeScript seed scripts without compilation
- **Used in:** Running `prisma/seed-terms.ts`
- **Version:** 4.7.0 or later
- **License:** MIT
- **Note:** Only needed if you don't already have a TypeScript execution tool

## Scripts to Add to package.json

```json
{
  "scripts": {
    "db:seed:terms": "tsx prisma/seed-terms.ts"
  }
}
```

## Already Required (No Action Needed)

These are assumed to be in your project already:

- `next` (14+)
- `react` (18+)
- `typescript` (5+)
- `@prisma/client`
- `prisma` (dev)
- `@trpc/server`
- `@trpc/client`
- `@trpc/react-query`
- `zod`
- `next-auth`
- `tailwindcss`

If any of these are missing, the terms implementation won't work.
