#!/bin/bash
# .validate-files.sh - Run at start of every session
# Checks for forbidden files and runs status check

echo "=== File Discipline Check ==="
echo ""

# Check for forbidden .md files in docs/
FORBIDDEN=$(find docs/ -name "stack*.md" -not -path "*/archive/*" 2>/dev/null)

if [[ -n "$FORBIDDEN" ]]; then
    echo "⚠️  WARNING: Found forbidden stack documentation files:"
    echo "$FORBIDDEN"
    echo ""
    echo "These files violate the documentation standard."
    echo ""
    echo "Required actions:"
    echo "1. Open each file and read content"
    echo "2. Append relevant information to ITERATIONS.md"
    echo "3. Delete the forbidden files: git rm <filename>"
    echo "4. Commit: git commit -m 'consolidate: move stackN docs to ITERATIONS.md'"
    echo "5. Re-run this script"
    echo ""
    exit 1
fi

echo "✅ No forbidden documentation files found"
echo ""

# Run status check
./check-status.sh
