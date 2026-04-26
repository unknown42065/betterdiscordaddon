/**
 * @name StatusAura
 * @description Reads your Spotify or YT Music activity and shifts Discord's accent colors to match the album art palette. Plugin + live theme in one.
 * @version 1.0.0
 * @author Unknown654
 * @authorLink https://github.com/Unknown42065/
 * @website https://github.com/Unknown42065/BetterDiscordAddons
 * @updateUrl https://raw.githubusercontent.com/Unknown42065/BetterDiscordAddons/main/StatusAura/StatusAura.plugin.js
 * @source https://github.com/Unknown422065/BetterDiscordAddons/tree/main/StatusAura
 */

const PLUGIN_NAME = "StatusAura";

// Known YT Music RPC application IDs (PreMiD, standalone apps, etc.)
const YTMUSIC_APP_IDS = new Set([
    "503557087041683458",   // PreMiD
    "1020414178101817374",  // YouTube Music RPC (common standalone)
    "463151177836658699",   // PreMiD alternative
]);

module.exports = class StatusAura {

    constructor() {
        this.defaultSettings = {
            transitionSpeed:  "medium",   // "fast" | "medium" | "slow"
            intensity:        "balanced", // "subtle" | "balanced" | "vivid"
            affectButtons:    true,
            affectScrollbars: true,
            affectMentions:   true,
            affectBadges:     true,
            backgroundTint:   false,
        };
        this.settings           = { ...this.defaultSettings };
        this._currentArtUrl     = null;
        this._currentSource     = null; // "spotify" | "ytmusic" | null
        this._unsubSpotify      = null;
        this._unsubPresence     = null;
        this._retryFlux         = null;
        this._styleIdTheme      = `${PLUGIN_NAME}-theme`;
        this._styleIdTransition = `${PLUGIN_NAME}-transition`;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    _requireLib() {
        if (!window.Unknown654Lib) {
            BdApi.UI?.showToast?.(`${PLUGIN_NAME} requires Unknown654Lib — please install it first.`, { type: "error" });
            return false;
        }
        return true;
    }

    start() {
        if (!this._requireLib()) return;
        const Lib = window.Unknown654Lib;

        const saved = Lib.loadData(PLUGIN_NAME, "settings", {});
        this.settings = { ...this.defaultSettings, ...saved };

        Lib.addStyle(this._styleIdTransition, this._buildTransitionCss());

        this._retryFlux = new Lib.Retry({
            interval: 500,
            maxTries: 20,
            onFail: () => Lib.showToast(`${PLUGIN_NAME}: Could not hook into Dispatcher. Try Ctrl+R.`, { type: "error" }),
        });

        this._retryFlux.start(() => {
            const Dispatcher = Lib.getDispatcher();
            if (!Dispatcher) return false;

            // Spotify — Discord has a dedicated store + dispatcher event
            this._onSpotifyState = (data) => this._handleSpotifyState(data);
            Dispatcher.subscribe("SPOTIFY_PLAYER_STATE", this._onSpotifyState);
            this._unsubSpotify = () => Dispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", this._onSpotifyState);

            // YT Music + fallback Spotify — presence activities
            this._onPresenceUpdate = (data) => this._handlePresenceUpdate(data);
            Dispatcher.subscribe("PRESENCE_UPDATES", this._onPresenceUpdate);
            this._unsubPresence = () => Dispatcher.unsubscribe("PRESENCE_UPDATES", this._onPresenceUpdate);

            // Immediate check on startup
            this._doInitialCheck();

            return true;
        });
    }

    stop() {
        if (!window.Unknown654Lib) return;
        const Lib = window.Unknown654Lib;

        this._retryFlux?.stop();
        this._unsubSpotify?.();
        this._unsubPresence?.();
        Lib.removeStyle(this._styleIdTheme);
        Lib.removeStyle(this._styleIdTransition);
        this._currentArtUrl = null;
        this._currentSource = null;
    }

    // ─── Settings Panel ───────────────────────────────────────────────────────

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.style.cssText = "padding:16px;color:var(--text-normal);font-family:var(--font-primary);";

        const save = () => {
            window.Unknown654Lib?.saveData(PLUGIN_NAME, "settings", this.settings);
            window.Unknown654Lib?.removeStyle(this._styleIdTransition);
            window.Unknown654Lib?.addStyle(this._styleIdTransition, this._buildTransitionCss());
        };

        const section = (label) => {
            const h = document.createElement("h3");
            h.textContent = label;
            h.style.cssText = "font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:18px 0 8px;";
            panel.appendChild(h);
        };

        const row = (label, el) => {
            const wrap = document.createElement("div");
            wrap.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--background-modifier-accent);";
            const span = document.createElement("span");
            span.textContent = label;
            span.style.fontSize = "14px";
            wrap.appendChild(span);
            wrap.appendChild(el);
            panel.appendChild(wrap);
        };

        // Select helper
        const makeSelect = (options, current, onChange) => {
            const sel = document.createElement("select");
            sel.style.cssText = "background:var(--background-secondary);color:var(--text-normal);border:1px solid var(--background-tertiary);border-radius:4px;padding:4px 8px;font-size:13px;cursor:pointer;";
            options.forEach(([val, label]) => {
                const opt = document.createElement("option");
                opt.value = val; opt.textContent = label;
                if (val === current) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.addEventListener("change", () => onChange(sel.value));
            return sel;
        };

        // Toggle helper
        const makeToggle = (checked, onChange) => {
            const label = document.createElement("label");
            label.style.cssText = "position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;";
            const input = document.createElement("input");
            input.type = "checkbox"; input.checked = checked;
            input.style.cssText = "opacity:0;width:0;height:0;position:absolute;";
            const slider = document.createElement("span");
            slider.style.cssText = `
                position:absolute;inset:0;border-radius:22px;
                background:${checked ? "var(--brand-experiment,#5865f2)" : "var(--background-tertiary)"};
                transition:background 0.2s;
            `;
            const knob = document.createElement("span");
            knob.style.cssText = `
                position:absolute;top:3px;left:${checked ? "21px" : "3px"};
                width:16px;height:16px;border-radius:50%;
                background:#fff;transition:left 0.2s;
            `;
            slider.appendChild(knob);
            label.appendChild(input);
            label.appendChild(slider);
            input.addEventListener("change", () => {
                const v = input.checked;
                slider.style.background = v ? "var(--brand-experiment,#5865f2)" : "var(--background-tertiary)";
                knob.style.left = v ? "21px" : "3px";
                onChange(v);
            });
            return label;
        };

        // ── Appearance ──
        section("Appearance");
        row("Transition speed", makeSelect(
            [["fast","Fast (0.3s)"],["medium","Medium (0.7s)"],["slow","Slow (1.5s)"]],
            this.settings.transitionSpeed,
            v => { this.settings.transitionSpeed = v; save(); }
        ));
        row("Intensity", makeSelect(
            [["subtle","Subtle"],["balanced","Balanced"],["vivid","Vivid"]],
            this.settings.intensity,
            v => { this.settings.intensity = v; save(); if (this._currentArtUrl) this._reapplyCurrentTheme(); }
        ));

        // ── Theme Targets ──
        section("Theme Targets");
        const toggleMap = [
            ["affectButtons",    "Affect buttons"],
            ["affectScrollbars", "Affect scrollbars"],
            ["affectMentions",   "Affect mentions & highlights"],
            ["affectBadges",     "Affect notification badges"],
            ["backgroundTint",   "Subtle background tint (experimental)"],
        ];
        toggleMap.forEach(([key, label]) => {
            row(label, makeToggle(this.settings[key], v => {
                this.settings[key] = v;
                save();
                if (this._currentArtUrl) this._reapplyCurrentTheme();
            }));
        });

        // ── Status ──
        section("Current Status");
        const statusEl = document.createElement("div");
        statusEl.style.cssText = "font-size:13px;color:var(--text-muted);padding:8px 0;display:flex;align-items:center;gap:8px;";
        const dot = document.createElement("span");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${this._currentArtUrl ? "#43b581" : "var(--text-muted)"};`;
        statusEl.appendChild(dot);
        const statusText = document.createElement("span");
        statusText.textContent = this._currentArtUrl
            ? `Active — sourced from ${this._currentSource === "spotify" ? "Spotify" : "YT Music"}`
            : "Idle — no music detected";
        statusEl.appendChild(statusText);
        panel.appendChild(statusEl);

        return panel;
    }

    // ─── Presence Handling ────────────────────────────────────────────────────

    _getCurrentUserId() {
        try {
            const UserStore = window.Unknown654Lib.findModule("getCurrentUser");
            return UserStore?.getCurrentUser()?.id ?? null;
        } catch { return null; }
    }

    _doInitialCheck() {
        // 1. Try Spotify store first (most reliable for Spotify)
        try {
            const SpotifyStore = BdApi.Webpack?.getStore?.("SpotifyStore");
            if (SpotifyStore) {
                const state = SpotifyStore.getPlaybackState?.();
                if (state?.isPlaying) {
                    const url = this._getSpotifyArtUrl(state);
                    if (url) { this._processArtUrl(url, "spotify"); return; }
                }
            }
        } catch {}

        // 2. Fall back to presence store for both
        try {
            const uid = this._getCurrentUserId();
            if (!uid) return;
            const PresenceStore = BdApi.Webpack?.getStore?.("PresenceStore");
            const activities = PresenceStore?.getActivities?.(uid) ?? [];
            this._processActivities(activities);
        } catch {}
    }

    _handleSpotifyState(data) {
        if (!data) return;
        if (data.isPlaying && data.track) {
            const url = this._getSpotifyArtUrl(data);
            if (url) { this._processArtUrl(url, "spotify"); return; }
        }
        // Spotify stopped — only clear if we were showing Spotify
        if (this._currentSource === "spotify") {
            this._currentArtUrl = null;
            this._currentSource = null;
            window.Unknown654Lib?.removeStyle(this._styleIdTheme);
        }
    }

    _handlePresenceUpdate(data) {
        const uid = this._getCurrentUserId();
        if (!uid) return;

        const updates = data?.updates ?? data?.presences ?? [];
        const mine = updates.find(u => u?.user?.id === uid);
        if (!mine) return;

        this._processActivities(mine.activities ?? []);
    }

    _processActivities(activities) {
        if (!Array.isArray(activities)) return;

        // YT Music activity (presence-based since no Discord store)
        const ytActivity = activities.find(a =>
            a?.name?.toLowerCase().includes("youtube music") ||
            YTMUSIC_APP_IDS.has(a?.application_id)
        );
        if (ytActivity) {
            const url = this._resolveActivityArtUrl(ytActivity);
            if (url) { this._processArtUrl(url, "ytmusic"); return; }
        }

        // Spotify via presence (fallback if SpotifyStore not available)
        const spotifyActivity = activities.find(a =>
            a?.type === 2 && a?.sync_id && a?.name?.toLowerCase() === "spotify"
        );
        if (spotifyActivity) {
            const url = this._resolveActivityArtUrl(spotifyActivity);
            if (url) { this._processArtUrl(url, "spotify"); return; }
        }

        // Nothing playing — reset if we were showing YT Music
        // (let Spotify handle its own reset via SPOTIFY_PLAYER_STATE)
        if (this._currentSource === "ytmusic") {
            this._currentArtUrl = null;
            this._currentSource = null;
            window.Unknown654Lib?.removeStyle(this._styleIdTheme);
        }
    }

    // ─── Art URL Resolution ───────────────────────────────────────────────────

    _getSpotifyArtUrl(stateOrEvent) {
        // SpotifyStore state: { track: { album: { image: { url } } } }
        const img = stateOrEvent?.track?.album?.image
                 ?? stateOrEvent?.track?.album?.images?.[1]
                 ?? stateOrEvent?.track?.album?.images?.[0];
        return img?.url ?? null;
    }

    _resolveActivityArtUrl(activity) {
        const img = activity?.assets?.large_image;
        if (!img) return null;

        // Spotify CDN: "spotify:ab67616d0000b273xxxxxxxxxx"
        if (img.startsWith("spotify:")) {
            const id = img.replace("spotify:", "");
            return `https://i.scdn.co/image/${id}`;
        }

        // Discord media proxy: "mp:external/{hash}/{protocol}/{domain}/{path}"
        if (img.startsWith("mp:external/")) {
            const stripped = img.replace("mp:external/", "");
            const parts = stripped.split("/");
            if (parts.length >= 3) {
                const protocol = parts[1];
                const rest = parts.slice(2).join("/");
                // Reconstruct: protocol://domain/path
                const url = `${protocol}://${rest}`;
                // Validate it looks like an image URL
                if (url.startsWith("http")) return url;
            }
            // Fallback: use Discord's proxy directly
            return `https://media.discordapp.net/external/${stripped}`;
        }

        // App asset key (registered with Discord): fetch from CDN
        if (activity?.application_id && !img.startsWith("http") && !img.includes("/")) {
            return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
        }

        // Already a full URL
        if (img.startsWith("http")) return img;

        return null;
    }

    // ─── Color Pipeline ───────────────────────────────────────────────────────

    async _processArtUrl(url, source) {
        if (url === this._currentArtUrl) return;

        this._currentArtUrl = url;
        this._currentSource = source;

        try {
            const palette = await this._extractPalette(url);
            // Guard: make sure this is still the current track
            if (palette && this._currentArtUrl === url) {
                this._applyTheme(palette);
            }
        } catch {
            // Silently fail — don't crash if CORS or network issues occur
        }
    }

    _reapplyCurrentTheme() {
        if (!this._currentArtUrl) return;
        this._extractPalette(this._currentArtUrl).then(palette => {
            if (palette) this._applyTheme(palette);
        }).catch(() => {});
    }

    _extractPalette(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";

            const timeout = setTimeout(() => reject(new Error("timeout")), 8000);

            img.onload = () => {
                clearTimeout(timeout);
                try {
                    const SIZE = 48; // 48×48 gives good coverage without being slow
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = SIZE;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, SIZE, SIZE);
                    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

                    const pixels = [];
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                        if (a < 128) continue;

                        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const sat = max === 0 ? 0 : (max - min) / max;

                        // Skip near-black, near-white, and near-grey
                        if (brightness < 0.07 || brightness > 0.95 || sat < 0.10) continue;

                        const [h, s, l] = this._rgbToHsl(r, g, b);
                        const vibrancy = sat * 1.6 + (1 - Math.abs(brightness - 0.5) * 2) * 0.4;
                        pixels.push({ r, g, b, h, s, l, brightness, sat, vibrancy });
                    }

                    if (pixels.length < 8) {
                        // Image is monochrome or very dark — use a neutral fallback
                        resolve(this._fallbackPalette());
                        return;
                    }

                    // Sort by vibrancy score — most colorful first
                    pixels.sort((a, b) => b.vibrancy - a.vibrancy);

                    const primary = pixels[0];

                    // Find a secondary color with a meaningfully different hue (≥ 35° away)
                    let secondary = null;
                    for (const p of pixels.slice(1)) {
                        const diff = Math.abs(p.h - primary.h);
                        if (Math.min(diff, 360 - diff) >= 35) {
                            secondary = p;
                            break;
                        }
                    }
                    secondary = secondary ?? pixels[Math.max(1, Math.floor(pixels.length * 0.35))];

                    // Derive tonal variants from the primary hue
                    const [h, s] = [primary.h, primary.s];
                    const sSat   = Math.min(s * 1.15, 0.95);
                    const mSat   = Math.min(s * 0.50, 0.70);

                    resolve({
                        primary:    [primary.r, primary.g, primary.b],
                        secondary:  [secondary.r, secondary.g, secondary.b],
                        light:      this._hslToRgb(h, sSat, 0.74),
                        dark:       this._hslToRgb(h, sSat, 0.25),
                        muted:      this._hslToRgb(h, mSat, 0.40),
                        hsl:        [h, s, primary.l],
                    });
                } catch (e) { reject(e); }
            };

            img.onerror = () => { clearTimeout(timeout); reject(new Error("image load failed")); };
            img.src = imageUrl;
        });
    }

    _fallbackPalette() {
        // Discord blurple — safe neutral fallback
        return {
            primary:   [88, 101, 242],
            secondary: [114, 137, 218],
            light:     [125, 135, 255],
            dark:      [55,  65,  175],
            muted:     [100, 108, 200],
            hsl:       [235, 0.856, 0.647],
        };
    }

    // ─── Colour Math ──────────────────────────────────────────────────────────

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return [0, 0, l];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h;
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
        return [h * 360, s, l];
    }

    _hslToRgb(h, s, l) {
        h /= 360;
        if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue = (t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        return [Math.round(hue(h + 1 / 3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1 / 3) * 255)];
    }

    // ─── Theme Application ────────────────────────────────────────────────────

    _applyTheme(palette) {
        const css = this._buildThemeCss(palette);
        window.Unknown654Lib.addStyle(this._styleIdTheme, css);
    }

    _intensityAlpha(base) {
        // Returns opacity multiplier based on intensity setting
        switch (this.settings.intensity) {
            case "subtle":   return base * 0.45;
            case "vivid":    return Math.min(base * 1.55, 1.0);
            default:         return base; // balanced
        }
    }

    _buildThemeCss(palette) {
        const { primary, light, dark, muted, hsl } = palette;
        const [h, s] = hsl;

        const rgb  = arr => arr.join(", ");
        const pr   = `rgb(${rgb(primary)})`;
        const li   = `rgb(${rgb(light)})`;
        const dk   = `rgb(${rgb(dark)})`;

        // Intensity-scaled opacities
        const glowA   = this._intensityAlpha(0.20).toFixed(2);
        const tintA   = this._intensityAlpha(0.04).toFixed(2);
        const selA    = this._intensityAlpha(0.22).toFixed(2);
        const scrollA = this._intensityAlpha(0.35).toFixed(2);
        const scrollHA= this._intensityAlpha(0.55).toFixed(2);

        // Build full brand experiment scale from the palette hue
        const scaleSat = Math.min(s * 1.2, 0.96);
        const SCALE = {
            100: 0.96, 130: 0.92, 160: 0.87, 200: 0.81,
            230: 0.74, 260: 0.67, 300: 0.59, 330: 0.52,
            345: 0.49, 360: 0.46, 400: 0.42, 430: 0.39,
            460: 0.35, 500: 0.32, 530: 0.28, 560: 0.24,
            600: 0.21, 630: 0.17, 660: 0.13, 700: 0.09,
            730: 0.07, 800: 0.05, 900: 0.03,
        };
        const scaleVars = Object.entries(SCALE).map(([key, l]) => {
            const [r, g, b] = this._hslToRgb(h, scaleSat, l);
            return `    --brand-experiment-${key}: rgb(${r}, ${g}, ${b});`;
        }).join("\n");

        // Brand 500 / 560
        const [b5r, b5g, b5b] = this._hslToRgb(h, scaleSat, 0.50);
        const brand500 = `rgb(${b5r}, ${b5g}, ${b5b})`;
        const [b6r, b6g, b6b] = this._hslToRgb(h, scaleSat, 0.42);
        const brand560 = `rgb(${b6r}, ${b6g}, ${b6b})`;

        let css = `
/* ═══ StatusAura — live album art palette ═══ */
:root {
${scaleVars}
    --brand-experiment: ${pr};
    --brand-500:        ${brand500};
    --brand-560:        ${brand560};
    --focus-primary:    ${pr};
    --aura-primary:     ${pr};
    --aura-light:       ${li};
    --aura-dark:        ${dk};
}

/* Chat input glow */
[class*="channelTextArea-"] [class*="inner-"] {
    box-shadow:
        0 0 0 1px rgba(${rgb(primary)}, ${glowA}),
        0 2px 20px rgba(${rgb(primary)}, ${(parseFloat(glowA) * 0.5).toFixed(2)}) !important;
    transition: box-shadow var(--aura-speed) ease;
}

/* Active channel / selected state */
[class*="selected-"] [class*="link-"],
[class*="modeSelected-"] {
    background-color: rgba(${rgb(primary)}, ${selA}) !important;
}

/* Selection highlight */
::selection {
    background: rgba(${rgb(primary)}, 0.35);
}
`;

        if (this.settings.affectButtons) css += `
/* Primary buttons */
[class*="colorBrand-"]:not(:disabled) {
    background-color: ${pr} !important;
}
[class*="colorBrand-"]:not(:disabled):hover {
    background-color: ${li} !important;
}
/* Checked toggles / radios */
[class*="checked-"] [class*="slider-"] {
    background-color: ${pr} !important;
}
`;

        if (this.settings.affectScrollbars) css += `
/* Scrollbars */
::-webkit-scrollbar-thumb {
    background-color: rgba(${rgb(primary)}, ${scrollA}) !important;
}
::-webkit-scrollbar-thumb:hover {
    background-color: rgba(${rgb(primary)}, ${scrollHA}) !important;
}
`;

        if (this.settings.affectMentions) css += `
/* Mentions */
[class*="mentioned-"] {
    border-left-color: ${pr} !important;
    background-color: rgba(${rgb(primary)}, ${(parseFloat(tintA) * 2).toFixed(2)}) !important;
}
[class*="mentioned-"]:hover {
    background-color: rgba(${rgb(primary)}, ${(parseFloat(tintA) * 3).toFixed(2)}) !important;
}
/* Inline code */
[class*="markup-"] code {
    border-color: rgba(${rgb(primary)}, 0.20) !important;
}
`;

        if (this.settings.affectBadges) css += `
/* Notification / unread badges */
[class*="numberBadge-"],
[class*="textBadge-"],
[class*="badge-"] {
    background-color: ${pr} !important;
}
/* Role tags */
[class*="roleTag-"],
[class*="botTag-"] {
    background-color: rgba(${rgb(primary)}, 0.28) !important;
    color: ${li} !important;
}
/* Voice speaking ring */
[class*="speaking-"] {
    box-shadow: inset 0 0 0 2px ${pr} !important;
}
`;

        if (this.settings.backgroundTint) css += `
/* Subtle background tint */
[class*="sidebar-"]::after,
[class*="panels-"]::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(${rgb(primary)}, ${tintA});
    pointer-events: none;
    z-index: 0;
}
`;

        return css.trim();
    }

    // ─── Transition CSS ───────────────────────────────────────────────────────

    _buildTransitionCss() {
        const speeds = { fast: "0.3s", medium: "0.7s", slow: "1.5s" };
        const speed  = speeds[this.settings.transitionSpeed] ?? "0.7s";

        return `
:root { --aura-speed: ${speed}; }

[class*="channelTextArea-"] [class*="inner-"],
[class*="selected-"] [class*="link-"],
[class*="modeSelected-"],
[class*="colorBrand-"],
[class*="checked-"] [class*="slider-"],
[class*="numberBadge-"],
[class*="textBadge-"],
[class*="badge-"],
[class*="roleTag-"],
[class*="botTag-"],
[class*="speaking-"],
[class*="mentioned-"] {
    transition:
        background-color var(--aura-speed) ease,
        background       var(--aura-speed) ease,
        border-color     var(--aura-speed) ease,
        box-shadow       var(--aura-speed) ease,
        color            var(--aura-speed) ease !important;
}
::-webkit-scrollbar-thumb {
    transition: background-color var(--aura-speed) ease !important;
}
        `.trim();
    }
};
