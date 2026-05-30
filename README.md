# scriptable-widgets

Scriptable widgets for iPhone, styled to match the desktop sepia aesthetic.
Data is served from the desktop over Tailscale.

## Widgets

### claude-usage

Shows live Claude rate-limit utilisation pulled from the Anthropic OAuth API.

```
CLAUDE                     PRO
██████░░░░░░░░  35%  5 HR
██░░░░░░░░░░░░  12%  7 DAY
         28k tokens today
```

Bars colour-code green → amber → red as usage climbs.

## Setup

### 1. Bridge server (desktop)

The bridge runs `usage.py` from the [noctalia-claude-remote](https://github.com/jackvanlint/noctalia-claude-remote) plugin and exposes it over HTTP so Scriptable can reach it over Tailscale.

```bash
# Copy bridge alongside usage.py
cp bridge/claude-usage-bridge.py ~/.config/noctalia/plugins/claude-remote/

# Install and start the systemd user service
cp bridge/claude-usage-bridge.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now claude-usage-bridge.service

# Verify
curl http://localhost:9753/usage
```

Requires the claude-remote plugin to already be installed (needs `usage.py`).

### 2. Scriptable widget (iPhone)

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) (free)
2. Open Scriptable → `+` → paste contents of `widgets/claude-usage.js` → name it `claude-usage`
3. Long press home screen → `+` → Scriptable → Medium → select `claude-usage`

The widget polls the bridge at `http://100.118.247.69:9753/usage` over Tailscale.
Shows "Desktop unreachable" gracefully when Tailscale is off.

## Requirements

- [noctalia-claude-remote](https://github.com/jackvanlint/noctalia-claude-remote) installed on desktop
- Tailscale connected (desktop Tailscale IP: `100.118.247.69`)
- Python 3 on desktop
- Scriptable on iPhone

## Author

Jack Vanlint
