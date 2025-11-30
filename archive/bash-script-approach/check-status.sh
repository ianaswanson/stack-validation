#!/bin/bash
# check-status.sh - Display current version status and next actions

echo "=== Setup Script Status Check ==="
echo ""

# Read current version from VERSION.md
VERSION=$(grep "^## Current Version:" VERSION.md | head -1 | awk '{print $4}')
STATUS_LINE=$(grep "^\*\*Status\*\*:" VERSION.md | head -1)
LAST_VALIDATED=$(grep "^\*\*Last Validated\*\*:" VERSION.md | head -1 | awk '{print $4, $5, $6, $7}')

# Extract status (either "UNTESTED" or "VALIDATED")
if [[ "$STATUS_LINE" =~ UNTESTED ]]; then
    STATUS="UNTESTED"
    PENDING_TEST=$(echo "$STATUS_LINE" | sed -n 's/.*pending \([^ )]*\).*/\1/p')
elif [[ "$STATUS_LINE" =~ VALIDATED ]]; then
    STATUS="VALIDATED"
    VALIDATED_DATE=$(echo "$STATUS_LINE" | sed -n 's/.*VALIDATED (\([^)]*\)).*/\1/p')
else
    STATUS="UNKNOWN"
fi

echo "📦 Current Version: $VERSION"
echo "🔍 Status: $STATUS"
echo "✅ Last Validated: $LAST_VALIDATED"
echo ""

# Check for uncommitted changes
UNCOMMITTED=""
if ! git diff --quiet setup.sh; then
    UNCOMMITTED="setup.sh"
fi
if ! git diff --quiet SETUP-GUIDE.md; then
    UNCOMMITTED="$UNCOMMITTED SETUP-GUIDE.md"
fi

if [[ -n "$UNCOMMITTED" ]]; then
    echo "⚠️  WARNING: Uncommitted changes in: $UNCOMMITTED"
    echo "   Review with: git diff <filename>"
    echo ""
fi

# Provide next actions based on status
if [[ "$STATUS" == "UNTESTED" ]]; then
    echo "⚠️  UNTESTED CHANGES EXIST"
    echo ""
    echo "📋 Next steps (follow in order):"
    echo "1. Read VERSION.md section 'Changes in $VERSION'"
    echo "2. Read VERSION.md section '$PENDING_TEST Validation Checklist'"
    echo "3. Run: ./setup.sh $PENDING_TEST"
    echo "4. Follow SETUP-GUIDE.md exactly (no deviations)"
    echo "5. Fill out ITERATIONS.md template with results"
    echo "6. Update VERSION.md based on outcome:"
    echo "   - If all passed → Update status to VALIDATED"
    echo "   - If any failed → Document issue, increment version"
    echo ""
elif [[ "$STATUS" == "VALIDATED" ]]; then
    echo "✅ SYSTEM IS STABLE"
    echo ""
    echo "The setup script is validated and ready for production use."
    echo ""
    echo "Do NOT run another iteration unless:"
    echo "  - User requests changes to setup.sh"
    echo "  - User wants to test a specific scenario"
    echo ""
    echo "Wait for user instructions."
    echo ""
else
    echo "❌ ERROR: Could not determine status from VERSION.md"
    echo "   Check VERSION.md format"
    echo ""
fi
