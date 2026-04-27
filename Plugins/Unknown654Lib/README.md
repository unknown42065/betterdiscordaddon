# Unknown654Lib

A shared utility library for Unknown654's BetterDiscord plugins. It abstracts BetterDiscord's internal APIs so that dependent plugins stay compatible across BD and Discord updates without each one duplicating the same boilerplate.

---

## Why does this exist?

BetterDiscord's API surface changes occasionally alongside Discord updates. Rather than patching every plugin separately, all shared lookups (Webpack module searches, navigation, data persistence, styling) live here. Update the library once and all plugins that use it benefit.

---

## Installation

1. Download `Unknown654Lib.plugin.js`.
2. Place it in your BetterDiscord plugins folder:
   - **Windows:** `%AppData%\BetterDiscord\plugins\`
   - **macOS:** `~/Library/Application Support/BetterDiscord/plugins/`
   - **Linux:** `~/.config/BetterDiscord/plugins/`
3. Enable **Unknown654Lib** in Settings → Plugins — **before** enabling any plugin that depends on it.

> Unknown654Lib has **no visible effect** on its own. It only provides an API for other plugins.

---

## API Reference

All methods are available on `window.Unknown654Lib` once the plugin is started.

### `findModule(...props)`
Returns the first Webpack module that exposes all of the named properties. Uses `BdApi.Webpack.getModule` with a modern filter, with a `BdApi.findModuleByProps` fallback for older BD versions.

```js
const ChannelStore = Lib.findModule("getChannel", "getDMFromUserId");
```

### `getDispatcher()`
Returns Discord's Flux dispatcher. Tries `BdApi.Webpack.getByKeys` first, then a filter-based scan, then legacy `findModuleByProps`.

```js
const D = Lib.getDispatcher();
D.subscribe("CHANNEL_SELECT", handler);
```

### `getStore(name)`
Returns a named Flux store via `BdApi.Webpack.getStore`. Returns `null` if unavailable.

```js
const UserStore = Lib.getStore("UserStore");
```

### `navigate(channelId, guildId)`
Navigates Discord to the specified channel. Pass a non-null `guildId` for guild channels; pass `null` for DMs.

```js
Lib.navigate("123456789", "987654321"); // guild channel
Lib.navigate("123456789", null);        // DM
```

### `addStyle(id, css)` / `removeStyle(id)`
Injects or removes a CSS style block. Uses `BdApi.DOM.addStyle` / `BdApi.DOM.removeStyle` with a `BdApi.injectCSS` / `BdApi.clearCSS` fallback.

### `loadData(pluginName, key, fallback)` / `saveData(pluginName, key, value)`
Wrappers around `BdApi.Data.load` / `BdApi.Data.save` for persistent plugin settings.

### `showToast(message, opts)`
Wrapper around `BdApi.UI.showToast`. Accepts the same `opts` object (`type`, `timeout`, etc.).

### `new Lib.Retry({ interval, maxTries, onFail })`
A simple retry scheduler. Calls a function repeatedly at `interval` ms until it returns `true` (success) or `maxTries` is exhausted, then calls `onFail`.

```js
const retry = new Lib.Retry({ interval: 500, maxTries: 20, onFail: () => console.error("gave up") });
retry.start(() => {
    const store = Lib.getStore("UserStore");
    if (!store) return false; // try again
    // do setup...
    return true; // done
});
```

---

## Changelog

### 1.1.3
- Added Dispatcher() safeguards
- Updated API methods

### 1.1.1
- **Fix:** `navigate()` now uses `getByKeys("transitionToGuild", "transitionTo")` as the first search path and checks that both `transitionToGuild` *and* `transitionTo` are present. The old filter required `replaceWith`, which is not always on the same module causing DM navigation to silently fail on some Discord builds.

### 1.1.0
- Added `getStore()` helper.
- Added `loadData()` / `saveData()` helpers.

### 1.0.0
- Initial release.

---

## Source

[github.com/Unknown42065/BetterDiscordAddons](https://github.com/Unknown42065/BetterDiscordAddons/tree/main/Unknown654Lib)
