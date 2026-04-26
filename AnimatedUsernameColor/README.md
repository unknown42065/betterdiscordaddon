# AnimatedUsernameColor

A BetterDiscord plugin that animates your own username color in chat with customizable colors, animation style, speed, and font.

> **Requires [Unknown654Lib](../Unknown654Lib/) to be installed and enabled first.**

---

## Features

- **Color cycling** — your username smoothly cycles through any number of custom colors
- **Pulse mode** — alternate between two colors with an opacity fade
- **8 built-in presets** — Rainbow, Sunset, Ocean, Neon, Forest, Candy, Galaxy, Fire
- **Custom colors** — add, remove, or edit individual color swatches
- **Font support** — choose from system fonts or load any Google Font by name (or type any font manually)
- **Speed control** — 1–12 s cycle duration with a labeled slider
- **Per-server toggle** — disable the effect in specific servers while keeping it active elsewhere
- **Import / Export** — copy your config as JSON and paste it on another device
- **Live preview** — the settings panel shows an animated preview that updates in real time

---

## Installation

1. Install and enable **[Unknown654Lib](../Unknown654Lib/)** first.
2. Download `AnimatedUsernameColor.plugin.js`.
3. Place it in your BetterDiscord plugins folder:
   - **Windows:** `%AppData%\BetterDiscord\plugins\`
   - **macOS:** `~/Library/Application Support/BetterDiscord/plugins/`
   - **Linux:** `~/.config/BetterDiscord/plugins/`
4. Enable **AnimatedUsernameColor** in Settings → Plugins.

---

## Settings

Open the plugin's settings panel (Settings → Plugins → AnimatedUsernameColor → ⚙) to access:

| Setting | Description |
|---------|-------------|
| **Preview** | Live animated preview of your current config |
| **Animation style** | Cycle (smooth loop) or Pulse (fade between two colors) |
| **Color presets** | One-click preset palettes |
| **Colors** | Add / remove / edit individual colors; export or import as JSON |
| **Font** | Type any font name, pick a system font, or choose a Google Font |
| **Cycle speed** | Drag the slider (1 s = fast, 12 s = slow) |
| **Per-server toggle** | Enable or disable the effect for the server you currently have open |

---

## How it works

The plugin uses a `MutationObserver` to watch for new elements added to the DOM. When a username element is detected whose text matches your current username (including display name / global name variants), it injects a CSS animation that cycles through your chosen colors via a `@keyframes` rule injected with `BdApi.DOM.addStyle`.

Google Fonts are loaded on demand by appending a `<link>` tag to `<head>`, and are removed cleanly when the plugin stops or the font is changed.

---

## Changelog

### 2.4.1
- Added per-server toggle to settings panel.
- Added Import / Export config via clipboard.
- Google Font support expanded; font field now accepts any free-text font name.

### 2.4.0
- Added Pulse animation style.
- Added color preset palettes.

### 2.2.3
- Rewritten to use Unknown654Lib.
- Settings persisted via `BdApi.Data`.

### 1.7.9
- Added Color Gradients to go along with Color Presets
- Added Fonts for more customization

### 1.4.2
- Added Color Presets
- Bug Fixes causing colors not to show up on discord

### 1.1.4
- Bug Fixes causing AnimatedUsernameColor from starting
- Bug Fixes causing AnimatedUsernameColor from pushing updates through automatically

### 1.0.0
- Initial Release of AnimatedUsernameColor.plugin.js

---

## Source

[github.com/Unknown42065/BetterDiscordAddons](https://github.com/Unknown42065/BetterDiscordAddons/tree/main/AnimatedUsernameColor)
