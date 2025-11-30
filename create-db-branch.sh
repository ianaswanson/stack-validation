#!/bin/bash

# create-db-branch.sh
# Helper script to create a Neon database branch for feature development
# Usage: ./create-db-branch.sh <feature-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="royal-bar-19096622"  # stack20 Neon project ID
REGION="aws-us-west-2"

# Check for feature name argument
if [ -z "$1" ]; then
  echo -e "${RED}Error: Feature name required${NC}"
  echo "Usage: ./create-db-branch.sh <feature-name>"
  echo "Example: ./create-db-branch.sh add-user-roles"
  exit 1
fi

FEATURE_NAME="$1"
BRANCH_NAME="feature-${FEATURE_NAME}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Creating Neon Database Branch for Feature Development    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "Feature: ${GREEN}${FEATURE_NAME}${NC}"
echo -e "Branch:  ${GREEN}${BRANCH_NAME}${NC}"
echo -e "Project: ${GREEN}${PROJECT_ID}${NC}"
echo ""

# Step 1: Create Neon branch
echo -e "${YELLOW}[1/5]${NC} Creating Neon branch..."
BRANCH_OUTPUT=$(neonctl branches create \
  --project-id "$PROJECT_ID" \
  --name "$BRANCH_NAME" \
  --output json)

BRANCH_ID=$(echo "$BRANCH_OUTPUT" | jq -r '.branch.id')

if [ -z "$BRANCH_ID" ] || [ "$BRANCH_ID" = "null" ]; then
  echo -e "${RED}Error: Failed to create Neon branch${NC}"
  echo "$BRANCH_OUTPUT"
  exit 1
fi

echo -e "${GREEN}✓${NC} Created branch: ${GREEN}${BRANCH_ID}${NC}"
echo ""

# Step 2: Wait for provisioning
echo -e "${YELLOW}[2/5]${NC} Waiting for Neon to provision branch (10 seconds)..."
sleep 10
echo -e "${GREEN}✓${NC} Branch should be ready"
echo ""

# Step 3: Get connection string
echo -e "${YELLOW}[3/5]${NC} Getting connection string..."
CONNECTION_STRING=$(neonctl connection-string \
  --project-id "$PROJECT_ID" \
  --branch-id "$BRANCH_ID")

if [ -z "$CONNECTION_STRING" ]; then
  echo -e "${RED}Error: Failed to get connection string${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Connection string retrieved"
echo ""

# Step 4: Push Prisma schema
echo -e "${YELLOW}[4/5]${NC} Pushing Prisma schema to new branch..."

# Check if we're in a directory with Prisma
if [ ! -f "prisma/schema.prisma" ]; then
  echo -e "${YELLOW}Warning: No prisma/schema.prisma found in current directory${NC}"
  echo "Skipping schema push. You'll need to do this manually."
  SCHEMA_PUSHED=false
else
  if DATABASE_URL="$CONNECTION_STRING" npx prisma db push --skip-generate 2>&1; then
    echo -e "${GREEN}✓${NC} Schema pushed successfully"
    SCHEMA_PUSHED=true
  else
    echo -e "${RED}✗${NC} Schema push failed (you may need to do this manually)"
    SCHEMA_PUSHED=false
  fi
fi
echo ""

# Step 5: Print instructions
echo -e "${YELLOW}[5/5]${NC} Next steps:"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Branch Created Successfully!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Branch ID:${NC}"
echo "$BRANCH_ID"
echo ""
echo -e "${YELLOW}Connection String:${NC}"
echo "$CONNECTION_STRING"
echo ""

if [ "$SCHEMA_PUSHED" = false ]; then
  echo -e "${YELLOW}Manual Schema Push Required:${NC}"
  echo "DATABASE_URL=\"$CONNECTION_STRING\" npx prisma db push"
  echo ""
fi

echo -e "${YELLOW}To use this database in Vercel preview:${NC}"
echo ""
echo "1. Push your feature branch to GitHub:"
echo "   git push origin feature/${FEATURE_NAME}"
echo ""
echo "2. Wait for Vercel preview deployment to be created"
echo ""
echo "3. Set DATABASE_URL for the preview:"
echo "   printf '%s' \"$CONNECTION_STRING\" | vercel env add DATABASE_URL preview"
echo ""
echo "4. Redeploy to pick up the new DATABASE_URL:"
echo "   vercel redeploy <deployment-url>"
echo ""
echo -e "${YELLOW}To clean up when done:${NC}"
echo "   neonctl branches delete $BRANCH_ID --project-id $PROJECT_ID"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Database branch ready for feature development${NC}"
echo ""
