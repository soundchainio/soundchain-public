#!/usr/bin/env bash
# check-vercel-deploy-filter.sh
# Guardrail: assert every soundchain-public-linked Vercel project still has its
# per-folder ignore-build-step, so a push to main only BUILDS the changed folder
# and the other projects auto-CANCEL (~free) instead of running 4 full builds.
#
# Background: see CLAUDE.md "📌 PINNED — VERCEL BUILD COST IS SOLVED" and memory
# feedback_vercel_monorepo_deploy_filter.md. Run this instead of re-diagnosing
# whenever "we're triggering all 4 on Vercel / high Vercel usage" comes up.
#
# Usage:  bash scripts/check-vercel-deploy-filter.sh
# Exit 0 = all projects correctly filtered; exit 1 = at least one is missing it.

set -euo pipefail

TEAM="team_zs0N0UXfjhpaS8cVJZtXgRwu"
EXPECTED='git diff --quiet HEAD^ HEAD -- .'
AUTH="$HOME/Library/Application Support/com.vercel.cli/auth.json"

TOKEN=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('$AUTH')))['token'])" 2>/dev/null || true)
if [ -z "${TOKEN:-}" ]; then
  echo "✗ No Vercel token at $AUTH — run 'vercel login' first." >&2
  exit 2
fi

# name<TAB>projectId  — the 4 projects linked to soundchainio/soundchain-public
PROJECTS=$(cat <<'EOF'
soundchain-site	prj_il0CxHkiaQPOa2whUPPehiq3gure	web
soundchain-lucy	prj_6t8PeI4eIT7MInO5cYeE9ZYfyufx	lucy
soundchain-arena	prj_Kd9HAv4YMiEsmDRS9ftd0Gd3ZUxF	arena
soundchain-mint	prj_YsBpbL0ae3R2JPQloHeVQhSSSAHr	mint
EOF
)

fail=0
printf '%-18s %-8s %-10s %s\n' "PROJECT" "ROOT" "STATUS" "IGNORE-BUILD-STEP"
while IFS=$'\t' read -r name pid exproot; do
  [ -z "$name" ] && continue
  json=$(curl -sS "https://api.vercel.com/v9/projects/$pid?teamId=$TEAM" -H "Authorization: Bearer $TOKEN")
  ignore=$(printf '%s' "$json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('commandForIgnoringBuildStep') or '')")
  root=$(printf '%s' "$json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('rootDirectory') or '')")
  if [ "$ignore" = "$EXPECTED" ] && [ "$root" = "$exproot" ]; then
    status="PASS"
  else
    status="FAIL"; fail=1
  fi
  printf '%-18s %-8s %-10s %s\n' "$name" "${root:-none}" "$status" "${ignore:-<none>}"
done <<< "$PROJECTS"

echo
if [ "$fail" -eq 0 ]; then
  echo "✓ All 4 projects filter by folder. A push to main = 1 build + 3 cancels (~free)."
  exit 0
else
  echo "✗ A project lost its ignore-build-step. Re-set it with:" >&2
  echo "  curl -X PATCH \"https://api.vercel.com/v9/projects/<id>?teamId=$TEAM\" \\" >&2
  echo "    -H \"Authorization: Bearer \$TOKEN\" -H 'Content-Type: application/json' \\" >&2
  echo "    -d '{\"commandForIgnoringBuildStep\":\"$EXPECTED\"}'" >&2
  exit 1
fi
