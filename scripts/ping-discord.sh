#!/usr/bin/env bash
# ping-discord.sh — post a SoundChain ship changelog to the Discord channels.
#
# The webhook URLs are WRITE-KEYS — they live ONLY in ~/srv/.discord-webhooks on
# anvil (chmod 600), never in this script, the repo, or any committed file.
# This script just reads that file and POSTs the message to each webhook.
#
# Usage:  bash ~/srv/ping-discord.sh "🚀 <build/feature changelog>"
#
# RULES (feedback_discord_pings_build_only_no_name_no_family): the message is a
# clean PRODUCT changelog — features shipped, user-facing. NEVER include names,
# family/personal info, IPs, ports, file paths, server names, or infra topology.
set -euo pipefail
MSG="${1:-}"
[ -z "$MSG" ] && { echo "usage: ping-discord.sh <message>"; exit 1; }
WHFILE="$HOME/srv/.discord-webhooks"
[ -f "$WHFILE" ] || { echo "no webhooks file at $WHFILE"; exit 1; }
# Build the JSON payload safely (handles quotes/newlines/emoji) via python3.
PAYLOAD="$(MSG="$MSG" python3 -c 'import json,os; print(json.dumps({"content": os.environ["MSG"][:1900]}))')"
rc=0
while IFS= read -r url; do
  [ -z "$url" ] && continue
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d "$PAYLOAD" "$url" || echo 000)"
  echo "discord -> $code"
  [ "$code" = "204" ] || rc=1
done < "$WHFILE"
exit $rc
