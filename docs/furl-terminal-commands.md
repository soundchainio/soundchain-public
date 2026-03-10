# FURL Terminal Commands

Custom cheat sheet for FURL CLI — SMITH, Forge, and Jack modes.

---

## Jack Commands

| Command | Description |
|---------|-------------|
| `jack` | Jack into SMITH streaming AI chat (Claude Haiku 4.5) |
| `jack forge` | Jack into SMITH FORGE coding agent (7 tools: read, write, edit, bash, git, glob, grep) |
| `jack cli` | CLI bridge to Cloudflare tunnel → ttyd → full Claude Code session |
| `exit` | Disconnect from any jack mode (SMITH, FORGE, or CLI) |

---

## SMITH Commands

| Command | Description |
|---------|-------------|
| `smith` | Show SMITH twin status + configuration |
| `smith key sk-ant-...` | Quick-add Claude API key to keybook |
| `smith openclaw <url> <token>` | Quick-add OpenClaw gateway credentials |
| `smith openclaw clear` | Remove all OpenClaw keys |
| `smith clear` | Remove all Claude API keys |

---

## Key Management (Keybook)

| Command | Description |
|---------|-------------|
| `keys` / `keys list` | Show all saved API keys |
| `keys add <label> sk-ant-...` | Save Claude key with label |
| `keys add <label> openclaw <url> <token>` | Save OpenClaw gateway with label |
| `keys use <# or label>` | Set active key for SMITH |
| `keys rm <# or label>` | Remove key from keybook |

---

## Tunnel (for CLI Bridge)

| Command | Description |
|---------|-------------|
| `tunnel <url>` | Set Cloudflare tunnel URL for `jack cli` |
| `tunnel show` | Show current tunnel URL |

---

## Agent EYE Commands

| Command | Description |
|---------|-------------|
| `/eye watch` | Start passive bug capture (WATCHING mode) |
| `/eye sleep` | Stop capture (DORMANT mode) |
| `/eye bugs` | List recent captured bugs |
| `/eye clear` | Clear bug buffer |
| `/eye status` | Show mode and stats |
| `/eye diagnose <url>` | Full diagnostic scan — JS errors, console, network, DOM, screenshot |

### Agent EYE Tools (LLM-callable)

| Tool | Description |
|------|-------------|
| `agent_eye_bugs` | List/inspect bugs, filter by severity |
| `agent_eye_status` | Mode, counts, buffer capacity |
| `agent_eye_clear` | Clear all bugs |
| `agent_eye_diagnose` | Navigate URL + full scan → report to ~/soundchain/reports/ |

---

## Agent Control

| Command | Description |
|---------|-------------|
| `wake <agent-name>` | Activate a specific agent |
| `wake all` | Activate all agents |
| `sleep <agent-name>` | Pause a specific agent |
| `sleep all` | Pause all agents except MANAGER |

---

## System Commands

| Command | Description |
|---------|-------------|
| `help` | List all commands |
| `status` | Show all agent statuses |
| `balance` | Show OGUN + POL wallet balances |
| `whoami` / `fingerprint` | FURL identity verification |
| `clear` | Clear terminal |
| `uptime` | Session uptime |
| `version` | FURL version + agent count |
| `copy` | Export session to clipboard as markdown |
| `cheats` | War Room cheat codes (CLI bridge) or prompt suggester (normal) |

---

## The 3 Jack Modes

| Mode | Command | What You Get |
|------|---------|-------------|
| **SMITH Chat** | `jack` | Streaming AI conversation (Claude/OpenClaw BYOK) |
| **SMITH Forge** | `jack forge` | Full coding agent on EC2 with 7 tools |
| **CLI Bridge** | `jack cli` | Full shell terminal via Cloudflare tunnel |

All three modes disconnect with `exit`.

---

## Command Aliases

```
jack          <->  smith jack
jack forge    <->  smith jack forge
jack cli      <->  smith jack cli
smith exit    <->  exit
activate      <->  wake
key sk-ant-.. <->  smith key sk-ant-..  (auto-expands to keys add)
```
