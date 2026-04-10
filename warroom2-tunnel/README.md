# SoundChain War Room 2 — Tunnel Setup

Public source files for setting up a SoundChain tunnel host on your own machine. This is what powers `tunnel2.soundchain.io` for Jeremy's War Room 2 (and any future war rooms).

## Architecture

```
Your phone (Safari/Chrome anywhere)
    ↓ WebSocket
tunnel2.soundchain.io (EC2 relay in the cloud)
    ↓ WebSocket
tunnel-agent (running on YOUR machine)
    ↓ localhost
pty-server (running on YOUR machine, port 7681)
    ↓ spawns
/bin/zsh → claude (ON YOUR MACHINE)
```

Your machine is the engine. Your phone is the steering wheel.

## Quick Setup (Mac Pro / iMac / MacBook Pro)

```bash
# 1. Install dependencies
cd warroom2-tunnel
npm install

# 2. Start pty-server (the shell host on port 7681)
npx tsx pty-server.ts &

# You should see:
# [pty-server] Listening on port 7681
# [pty-server] Shell: /bin/zsh
# [pty-server] Ready. Waiting for connections...

# 3. Start tunnel-agent (connects your machine to the EC2 relay)
TUNNEL_HOST_SECRET=929b8ca5c3ba94719750fd2f8e2e358768763634627dbbfc \
RELAY_URL=wss://tunnel2.soundchain.io \
TTYD_URL=ws://localhost:7681/ws \
npx tsx agent.ts

# You should see:
# [agent] Tunnel agent starting
# [agent]   Relay: wss://tunnel2.soundchain.io
# [agent] Connected to relay
```

Once you see **"Connected to relay"** — your machine is online. Verify with:

```bash
curl -s https://tunnel.soundchain.io/health | grep tunnel2
# Should show: "tunnel2.soundchain.io":{"connected":true,...}
```

## Connect From Anywhere

1. Open `soundchain.io/dex/feed` in any browser (phone, iMac, MacBook Pro, etc.)
2. Log in as `jeremy_soundchain`
3. In the FURL terminal at the top, type ONCE:
   ```
   keys add warroom2 tunnel tunnel2.soundchain.io
   ```
4. Type:
   ```
   jack cli
   ```
5. Terminal connects to YOUR machine through the relay
6. Claude Code auto-launches on your machine
7. Log in with your Claude Max OAuth
8. You're in War Room 2.

## Make It Permanent (auto-start on reboot)

Ask your Claude Code to create launchd services:

> "Create two launchd plists for me:
> 1. `com.warroom2.pty-server.plist` — runs `npx tsx pty-server.ts` from `~/path/to/warroom2-tunnel`
> 2. `com.warroom2.tunnel-agent.plist` — runs `npx tsx agent.ts` with these env vars:
>    - `TUNNEL_HOST_SECRET=929b8ca5c3ba94719750fd2f8e2e358768763634627dbbfc`
>    - `RELAY_URL=wss://tunnel2.soundchain.io`
>    - `TTYD_URL=ws://localhost:7681/ws`
>
> Both should `KeepAlive` and `RunAtLoad`."

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | Connects your machine to EC2 relay, multiplexes browser sessions to local pty-server |
| `pty-server.ts` | Spawns shell processes on localhost:7681 (replacement for ttyd, no segfaults) |
| `package.json` | Dependencies: `node-pty`, `ws`, `tsx`, `typescript` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `No eligible devices` in Xcode | Different problem, see Apple Watch handoff |
| `[agent] Relay error: ETIMEDOUT` | EC2 relay temporarily down, agent will auto-retry every 30s |
| `[agent] Connected to relay` then immediately disconnects | pty-server not running on localhost:7681, restart it |
| `access denied — jack cli is restricted` in FURL | Your handle isn't whitelisted, ping Frank to add it |
| Browser shows `disconnected` repeatedly | Both pty-server AND tunnel-agent must be running on the host machine |

## Security Notes

- `TUNNEL_HOST_SECRET` is shared between all war room operators on the same tunnel — keep it private
- The pty-server gives full shell access to whoever connects through the relay — only whitelisted handles in `AgentStatusTicker.tsx` can use `jack cli`
- Use Claude Code with your OWN OAuth login — never share API keys
- The shared filesystem on your machine is what Claude reads — keep `.env` files out of the directory you run Claude in
