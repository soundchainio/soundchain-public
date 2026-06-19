#!/usr/bin/env bash
# anvil-mongo-socks.sh — keep a SOCKS5 proxy on anvil:1080 that egresses from
# the EC2 relay's STATIC IP (44.209.136.62), which IS allowlisted in MongoDB
# Atlas. anvil's residential/DHCP egress IP is NOT allowlisted (and Frank can't
# reach the Atlas console to add it), so web/arena/mint route Mongo through this
# proxy via the driver's proxyHost=127.0.0.1&proxyPort=1080 connection params.
# Foreground ssh inside a while-loop = self-healing supervisor; launch detached
# with setsid and @reboot via crontab.
KEY="$HOME/.ssh/soundchain-key-pair-2025.pem"
EC2="ubuntu@44.209.136.62"
PORT=1080
LOG="$HOME/srv/mongo-socks.log"
while true; do
  echo "$(date -u +%FT%TZ) starting SOCKS :$PORT -> $EC2" >> "$LOG"
  ssh -i "$KEY" \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -N -D 127.0.0.1:$PORT "$EC2" >> "$LOG" 2>&1
  echo "$(date -u +%FT%TZ) SOCKS proxy exited — restarting in 5s" >> "$LOG"
  sleep 5
done
