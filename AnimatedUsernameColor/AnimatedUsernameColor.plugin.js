/**
 * @name AnimatedUsernameColor
 * @description Animates your own username color in chat with customizable colors, speed, and font.
 * @version 2.3.9
 * @author Unknown654#0
 * @website https://github.com/Unknown42065/BetterDiscordAddons
 * @updateUrl https://raw.githubusercontent.com/Unknown42065/BetterDiscordAddons/main/AnimatedUsernameColor/AnimatedUsernameColor.plugin.js
 * @source    https://github.com/Unknown42065/BetterDiscordAddons/tree/main/AnimatedUsernameColor
 */

const PLUGIN_NAME = "AnimatedUsernameColor";
 
const GOOGLE_FONTS = {
    "Press Start 2P":  "Press+Start+2P",
    "Dancing Script":  "Dancing+Script:wght@700",
    "Creepster":       "Creepster",
    "Bebas Neue":      "Bebas+Neue",
    "Pacifico":        "Pacifico",
    "Orbitron":        "Orbitron:wght@700",
    "Permanent Marker":"Permanent+Marker",
};
 
const SYSTEM_FONTS = [
    { label: "Default",    value: "" },
    { label: "Comic Sans", value: "Comic Sans MS" },
    { label: "Impact",     value: "Impact" },
    { label: "Courier",    value: "Courier New" },
    { label: "Georgia",    value: "Georgia" },
    { label: "Papyrus",    value: "Papyrus" },
];
 
const COLOR_PRESETS = [
    { name: "🏳️‍🌈 Rainbow", colors: ["#ff4444", "#ff9900", "#ffff00", "#44ff44", "#4488ff", "#aa44ff"] },
    { name: "🌅 Sunset",    colors: ["#ff6b6b", "#feca57", "#ff9f43", "#ee5a24"] },
    { name: "🌊 Ocean",     colors: ["#0abde3", "#48dbfb", "#006ba6", "#0496ff"] },
    { name: "⚡ Neon",      colors: ["#ff00ff", "#00ffff", "#ff00aa", "#aa00ff"] },
    { name: "🌿 Forest",    colors: ["#55efc4", "#00b894", "#6ab04c", "#badc58"] },
    { name: "🍬 Candy",     colors: ["#fd79a8", "#fdcb6e", "#e17055", "#a29bfe"] },
    { name: "🌌 Galaxy",    colors: ["#a29bfe", "#6c5ce7", "#fd79a8", "#0984e3"] },
    { name: "🔥 Fire",      colors: ["#ff4444", "#ff6600", "#ffaa00", "#ff2200"] },
];
 
module.exports = class AnimatedUsernameColor {
 
    constructor() {
        this.defaultSettings = {
            colors: ["#ff4444", "#ff9900", "#ffff00", "#44ff44", "#4488ff", "#aa44ff"],
            speed:  4,
            font:   "",
            animStyle:       "cycle",
            disabledServers: []
        };
        this._retryCount = 0;
        this._maxRetries = 10;
        this._retryTimer = null;
        this.currentUser = null;
        this._names      = [];
        this._observer   = null;
        this._fontLinkEl = null;
    }
 
    start() {
        const saved = BdApi.Data.load(PLUGIN_NAME, "settings") ?? {};
        this.settings = {
            ...this.defaultSettings,
            ...saved,
            colors: Array.isArray(saved.colors) && saved.colors.length >= 2
                ? saved.colors
                : [...this.defaultSettings.colors],
            disabledServers: Array.isArray(saved.disabledServers) ? saved.disabledServers : []
        };
        this._tryInit();
    }
 
    stop() {
        BdApi.DOM.removeStyle(PLUGIN_NAME);
        this._removeFontLink();
        this._stopObserver();
        document.querySelectorAll("[data-auc]").forEach(el => {
            el.style.removeProperty("animation");
            el.style.removeProperty("font-family");
            el.removeAttribute("data-auc");
        });
        if (this._retryTimer) clearTimeout(this._retryTimer);
    }
 
    _tryInit() {
        try {
            const UserStore = BdApi.Webpack.getStore("UserStore");
            this.currentUser = UserStore?.getCurrentUser?.();
        } catch(e) {}
 
        if (!this.currentUser) {
            if (this._retryCount < this._maxRetries) {
                this._retryCount++;
                this._retryTimer = setTimeout(() => this._tryInit(), 500);
            } else {
                BdApi.UI.showToast(`${PLUGIN_NAME}: Could not find your user. Try Ctrl+R.`, { type: "error" });
            }
            return;
        }
 
        const u = this.currentUser;
        this._names = [...new Set([
            u.username,
            u.globalName,
            u.displayName,
            u.username?.toLowerCase(),
            u.globalName?.toLowerCase(),
            u.displayName?.toLowerCase(),
        ].filter(Boolean))];
 
        this._injectKeyframes();
        this._loadFontIfNeeded(this.settings.font);
        this._startObserver();
        BdApi.UI.showToast(`${PLUGIN_NAME} enabled!`, { type: "success" });
    }
 
    _injectKeyframes() {
        const colors = this.settings.colors;
        let css;
        if (this.settings.animStyle === "pulse") {
            const c1 = colors[0];
            const c2 = colors[Math.floor(colors.length / 2)] ?? colors[1];
            css = `@keyframes auc-cycle {
                0%, 100% { color: ${c1}; opacity: 1; }
                50%       { color: ${c2}; opacity: 0.55; }
            }`;
        } else {
            const stops = colors.map((c, i) =>
                `${Math.round((i / colors.length) * 100)}% { color: ${c}; }`
            );
            stops.push(`100% { color: ${colors[0]}; }`);
            css = `@keyframes auc-cycle { ${stops.join(" ")} }`;
        }
        BdApi.DOM.removeStyle(PLUGIN_NAME);
        BdApi.DOM.addStyle(PLUGIN_NAME, css);
    }
 
    _loadFontIfNeeded(fontName) {
        this._removeFontLink();
        if (!fontName || !GOOGLE_FONTS[fontName]) return;
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS[fontName]}&display=swap`;
        document.head.appendChild(link);
        this._fontLinkEl = link;
    }
 
    _removeFontLink() {
        this._fontLinkEl?.remove();
        this._fontLinkEl = null;
    }
 
    _currentGuildId() {
        try {
            return BdApi.Webpack.getStore("SelectedGuildStore")?.getGuildId() ?? null;
        } catch(e) { return null; }
    }
 
    _isEnabledInCurrentServer() {
        const guildId = this._currentGuildId();
        if (!guildId) return true;
        return !this.settings.disabledServers.includes(guildId);
    }
 
    _isOurName(text) {
        if (!text) return false;
        const t = text.trim();
        return this._names.includes(t) || this._names.includes(t.toLowerCase());
    }
 
    _applyStyle(el) {
        if (!el) return;
        el.style.setProperty("animation", `auc-cycle ${this.settings.speed}s linear infinite`, "important");
        if (this.settings.font) {
            el.style.setProperty("font-family", `'${this.settings.font}', sans-serif`, "important");
        } else {
            el.style.removeProperty("font-family");
        }
        el.setAttribute("data-auc", "1");
    }
 
    _removeStyle(el) {
        if (!el) return;
        el.style.removeProperty("animation");
        el.style.removeProperty("font-family");
        el.removeAttribute("data-auc");
    }
 
    _scanForNames(root) {
        if (!root || root.nodeType !== 1) return;
        const enabled = this._isEnabledInCurrentServer();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        while (node) {
            if (node.childElementCount <= 2) {
                const text = node.textContent?.trim();
                if (text && this._isOurName(text)) {
                    if (enabled) this._applyStyle(node);
                    else this._removeStyle(node);
                }
            }
            node = walker.nextNode();
        }
    }
 
    _applyToExisting() {
        this._scanForNames(document.body);
    }
 
    _startObserver() {
        this._stopObserver();
        this._observer = new MutationObserver(mutations => {
            for (const mut of mutations) {
                for (const node of mut.addedNodes) {
                    if (node.nodeType === 1) this._scanForNames(node);
                }
            }
        });
        this._observer.observe(document.body, { childList: true, subtree: true });
        this._applyToExisting();
    }
 
    _stopObserver() {
        this._observer?.disconnect();
        this._observer = null;
    }
 
    saveAndRefresh() {
        BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
        this._injectKeyframes();
        this._loadFontIfNeeded(this.settings.font);
        if (this._isEnabledInCurrentServer()) {
            document.querySelectorAll("[data-auc]").forEach(el => this._applyStyle(el));
        } else {
            document.querySelectorAll("[data-auc]").forEach(el => this._removeStyle(el));
        }
        this._applyToExisting();
    }
 
    getSettingsPanel() {
        const previewId = `auc-preview-${Date.now()}`;
        let previewStyleEl = null;
 
        const panel = document.createElement("div");
        panel.style.cssText = `
            padding: 16px;
            font-family: 'gg sans', 'Noto Sans', sans-serif;
            color: var(--text-normal, #dcddde);
            background: var(--background-secondary, #2f3136);
            border-radius: 8px;
        `;
 
        const title = document.createElement("h2");
        title.textContent = "🎨 Animated Username Color";
        title.style.cssText = "margin: 0 0 4px 0; font-size: 18px; color: var(--header-primary, #fff);";
        panel.appendChild(title);
 
        const subtitle = document.createElement("p");
        subtitle.textContent = "Customize your username color, font, and animation speed.";
        subtitle.style.cssText = "margin: 0 0 20px 0; font-size: 13px; opacity: 0.6;";
        panel.appendChild(subtitle);
 
        const mkDivider = () => {
            const d = document.createElement("div");
            d.style.cssText = "border-top: 1px solid rgba(255,255,255,0.08); margin: 4px 0 20px 0;";
            return d;
        };
        const mkSectionLabel = text => {
            const l = document.createElement("div");
            l.textContent = text;
            l.style.cssText = "font-size: 11px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.5; margin-bottom: 10px;";
            return l;
        };

        const previewWrap = document.createElement("div");
        previewWrap.style.cssText = "margin-bottom: 20px;";
        previewWrap.appendChild(mkSectionLabel("PREVIEW"));
        const preview = document.createElement("span");
        preview.id = previewId;
        preview.textContent = this.currentUser?.username ?? "YourUsername";
        preview.style.cssText = "font-size: 20px; font-weight: 700; display: inline-block;";
        previewWrap.appendChild(preview);
        panel.appendChild(previewWrap);
 
        const updatePreview = () => {
            const colors = this.settings.colors;
            if (colors.length < 2) return;
            let keyframes;
            if (this.settings.animStyle === "pulse") {
                const c1 = colors[0];
                const c2 = colors[Math.floor(colors.length / 2)] ?? colors[1];
                keyframes = `@keyframes auc-prev-${previewId} { 0%, 100% { color: ${c1}; opacity: 1; } 50% { color: ${c2}; opacity: 0.55; } }`;
            } else {
                const stops = colors.map((c, i) => `${Math.round((i / colors.length) * 100)}% { color: ${c}; }`);
                stops.push(`100% { color: ${colors[0]}; }`);
                keyframes = `@keyframes auc-prev-${previewId} { ${stops.join(" ")} }`;
            }
            const font = this.settings.font;
            if (!previewStyleEl) { previewStyleEl = document.createElement("style"); document.head.appendChild(previewStyleEl); }
            previewStyleEl.textContent = `
                ${keyframes}
                #${previewId} {
                    animation: auc-prev-${previewId} ${this.settings.speed}s linear infinite;
                    ${font ? `font-family: '${font}', sans-serif;` : ""}
                }
            `;
        };
        updatePreview();
        
        panel.appendChild(mkDivider());
        panel.appendChild(mkSectionLabel("ANIMATION STYLE"));
        const animWrap = document.createElement("div");
        animWrap.style.cssText = "display: flex; gap: 8px; margin-bottom: 20px;";
 
        const refreshAnimButtons = () => {
            animWrap.querySelectorAll("button").forEach(b => {
                const active = b.dataset.val === this.settings.animStyle;
                b.style.background  = active ? "#5865f2" : "rgba(255,255,255,0.06)";
                b.style.borderColor = active ? "#5865f2" : "rgba(255,255,255,0.15)";
            });
        };
 
        [["cycle", "🔄 Cycle"], ["pulse", "💓 Pulse"]].forEach(([val, label]) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            btn.dataset.val = val;
            btn.style.cssText = "border: 1px solid; color: white; border-radius: 4px; padding: 6px 18px; cursor: pointer; font-size: 13px; transition: background 0.15s;";
            btn.addEventListener("click", () => {
                this.settings.animStyle = val;
                refreshAnimButtons();
                updatePreview();
                this.saveAndRefresh();
            });
            animWrap.appendChild(btn);
        });
        refreshAnimButtons();
        panel.appendChild(animWrap);
 
        panel.appendChild(mkDivider());
        panel.appendChild(mkSectionLabel("COLOR PRESETS"));
        const presetsWrap = document.createElement("div");
        presetsWrap.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;";
        COLOR_PRESETS.forEach(preset => {
            const btn = document.createElement("button");
            const gradStr = `linear-gradient(90deg, ${preset.colors.join(", ")})`;
            btn.style.cssText = "border: none; border-radius: 6px; cursor: pointer; padding: 0; overflow: hidden; width: 108px; height: 38px; position: relative;";
            btn.innerHTML = `
                <div style="position:absolute;inset:0;background:${gradStr};opacity:0.85;"></div>
                <span style="position:relative;font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${preset.name}</span>
            `;
            btn.addEventListener("click", () => {
                this.settings.colors = [...preset.colors];
                updatePreview(); this.saveAndRefresh(); renderColors();
                BdApi.UI.showToast(`Preset "${preset.name}" applied!`, { type: "success" });
            });
            presetsWrap.appendChild(btn);
        });
        panel.appendChild(presetsWrap);
        panel.appendChild(mkDivider());
        panel.appendChild(mkSectionLabel("COLORS"));
 
        const ioRow = document.createElement("div");
        ioRow.style.cssText = "display: flex; gap: 8px; margin-bottom: 12px;";
        const ioBtnStyle = "background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: var(--text-muted,#a3a6aa); border-radius: 4px; padding: 5px 12px; cursor: pointer; font-size: 12px;";
 
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "⬆ Export config";
        exportBtn.style.cssText = ioBtnStyle;
        exportBtn.addEventListener("click", () => {
            const json = JSON.stringify({
                colors:    this.settings.colors,
                speed:     this.settings.speed,
                font:      this.settings.font,
                animStyle: this.settings.animStyle
            });
            navigator.clipboard.writeText(json)
                .then(() => BdApi.UI.showToast("Config copied to clipboard!", { type: "success" }));
        });
 
        const importBtn = document.createElement("button");
        importBtn.textContent = "⬇ Import config";
        importBtn.style.cssText = ioBtnStyle;
        importBtn.addEventListener("click", async () => {
            try {
                const text = await navigator.clipboard.readText();
                const data = JSON.parse(text);
                if (!Array.isArray(data.colors) || data.colors.length < 2) throw new Error("bad");
                this.settings.colors = data.colors;
                if (typeof data.speed     === "number") this.settings.speed     = data.speed;
                if (typeof data.font      === "string") this.settings.font      = data.font;
                if (typeof data.animStyle === "string") this.settings.animStyle = data.animStyle;
                slider.value           = this.settings.speed;
                speedValue.textContent = formatSpeed(this.settings.speed);
                fontInput.value        = this.settings.font;
                refreshAnimButtons();
                updatePreview(); this.saveAndRefresh(); renderColors();
                BdApi.UI.showToast("Config imported!", { type: "success" });
            } catch(e) {
                BdApi.UI.showToast("Clipboard doesn't contain a valid config.", { type: "error" });
            }
        });
 
        ioRow.appendChild(exportBtn);
        ioRow.appendChild(importBtn);
        panel.appendChild(ioRow);
 
        const colorList = document.createElement("div");
        colorList.style.cssText = "display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; align-items: center;";
        panel.appendChild(colorList);
 
        const renderColors = () => {
            colorList.innerHTML = "";
            this.settings.colors.forEach((color, index) => {
                const wrap = document.createElement("div");
                wrap.style.cssText = "position: relative; display: inline-flex;";
                const swatch = document.createElement("input");
                swatch.type = "color"; swatch.value = color; swatch.title = `Color ${index + 1}`;
                swatch.style.cssText = "width: 48px; height: 48px; border: 2px solid rgba(255,255,255,0.15); border-radius: 8px; cursor: pointer; padding: 2px; background: none;";
                swatch.addEventListener("input", e => { this.settings.colors[index] = e.target.value; updatePreview(); this.saveAndRefresh(); });
                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✕";
                removeBtn.style.cssText = "position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: #ed4245; border: none; color: white; border-radius: 50%; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center;";
                removeBtn.addEventListener("click", () => {
                    if (this.settings.colors.length <= 2) { BdApi.UI.showToast("Need at least 2 colors!", { type: "error" }); return; }
                    this.settings.colors.splice(index, 1); updatePreview(); this.saveAndRefresh(); renderColors();
                });
                wrap.appendChild(swatch); wrap.appendChild(removeBtn); colorList.appendChild(wrap);
            });
            const addBtn = document.createElement("button");
            addBtn.textContent = "+";
            addBtn.style.cssText = "width: 48px; height: 48px; background: rgba(255,255,255,0.08); border: 2px dashed rgba(255,255,255,0.2); border-radius: 8px; color: white; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s;";
            addBtn.onmouseenter = () => addBtn.style.background = "rgba(255,255,255,0.15)";
            addBtn.onmouseleave = () => addBtn.style.background = "rgba(255,255,255,0.08)";
            addBtn.addEventListener("click", () => { this.settings.colors.push("#ffffff"); updatePreview(); this.saveAndRefresh(); renderColors(); });
            colorList.appendChild(addBtn);
        };
        renderColors();
 
        const resetBtn = document.createElement("button");
        resetBtn.textContent = "↺ Reset to defaults";
        resetBtn.style.cssText = "background: none; border: 1px solid rgba(255,255,255,0.15); color: var(--text-muted, #a3a6aa); border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; margin-bottom: 24px; display: block;";
        resetBtn.addEventListener("click", () => {
            this.settings.colors = [...this.defaultSettings.colors];
            updatePreview(); this.saveAndRefresh(); renderColors();
            BdApi.UI.showToast("Colors reset!", { type: "success" });
        });
        panel.appendChild(resetBtn);
        panel.appendChild(mkDivider());
        panel.appendChild(mkSectionLabel("FONT"));
        const fontInputWrap = document.createElement("div");
        fontInputWrap.style.cssText = "display: flex; gap: 8px; align-items: center; margin-bottom: 12px;";
        const fontInput = document.createElement("input");
        fontInput.type = "text"; fontInput.placeholder = "Type any font name e.g. Arial, Verdana..."; fontInput.value = this.settings.font;
        fontInput.style.cssText = "flex: 1; padding: 6px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: white; font-size: 13px; outline: none;";
        fontInput.addEventListener("input", e => { this.settings.font = e.target.value.trim(); updatePreview(); this.saveAndRefresh(); });
        const clearFontBtn = document.createElement("button");
        clearFontBtn.textContent = "✕ Clear";
        clearFontBtn.style.cssText = "background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: var(--text-muted, #a3a6aa); border-radius: 4px; padding: 6px 10px; cursor: pointer; font-size: 12px; white-space: nowrap;";
        clearFontBtn.addEventListener("click", () => { this.settings.font = ""; fontInput.value = ""; updatePreview(); this.saveAndRefresh(); });
        fontInputWrap.appendChild(fontInput); fontInputWrap.appendChild(clearFontBtn);
        panel.appendChild(fontInputWrap);
 
        const systemPresetsLabel = document.createElement("div");
        systemPresetsLabel.textContent = "SYSTEM FONTS";
        systemPresetsLabel.style.cssText = "font-size: 10px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.35; margin-bottom: 8px;";
        panel.appendChild(systemPresetsLabel);
        const systemPresetWrap = document.createElement("div");
        systemPresetWrap.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;";
        panel.appendChild(systemPresetWrap);
        const googlePresetsLabel = document.createElement("div");
        googlePresetsLabel.textContent = "GOOGLE FONTS (loads from internet)";
        googlePresetsLabel.style.cssText = "font-size: 10px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.35; margin-bottom: 8px;";
        panel.appendChild(googlePresetsLabel);
        const googlePresetWrap = document.createElement("div");
        googlePresetWrap.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;";
        panel.appendChild(googlePresetWrap);
 
        const renderPresetButtons = () => {
            systemPresetWrap.innerHTML = "";
            SYSTEM_FONTS.forEach(({ label, value }) => {
                const btn = document.createElement("button"); btn.textContent = label;
                const isActive = this.settings.font === value;
                btn.style.cssText = `background: ${isActive ? "#5865f2" : "rgba(255,255,255,0.06)"}; border: 1px solid ${isActive ? "#5865f2" : "rgba(255,255,255,0.15)"}; color: white; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; font-family: '${value || "inherit"}', sans-serif;`;
                btn.addEventListener("click", () => { this.settings.font = value; fontInput.value = value; updatePreview(); this.saveAndRefresh(); renderPresetButtons(); renderGoogleButtons(); });
                systemPresetWrap.appendChild(btn);
            });
        };
        const renderGoogleButtons = () => {
            googlePresetWrap.innerHTML = "";
            Object.keys(GOOGLE_FONTS).forEach(fontName => {
                const btn = document.createElement("button"); btn.textContent = fontName;
                const isActive = this.settings.font === fontName;
                btn.style.cssText = `background: ${isActive ? "#5865f2" : "rgba(255,255,255,0.06)"}; border: 1px solid ${isActive ? "#5865f2" : "rgba(255,255,255,0.15)"}; color: white; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px;`;
                btn.addEventListener("click", () => { this.settings.font = fontName; fontInput.value = fontName; updatePreview(); this.saveAndRefresh(); renderPresetButtons(); renderGoogleButtons(); });
                googlePresetWrap.appendChild(btn);
            });
        };
        renderPresetButtons();
        renderGoogleButtons();
        panel.appendChild(mkDivider());
        const speedSection = document.createElement("div");
        const speedHeader = document.createElement("div");
        speedHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
        const speedLabelEl = document.createElement("div");
        speedLabelEl.textContent = "CYCLE SPEED";
        speedLabelEl.style.cssText = "font-size: 11px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.5;";
        const speedValue = document.createElement("div");
        speedValue.style.cssText = "font-size: 13px; font-weight: 600; color: var(--header-primary, #fff);";
        const formatSpeed = v => v <= 2 ? `${v}s — Fast` : v <= 5 ? `${v}s — Medium` : `${v}s — Slow`;
        speedValue.textContent = formatSpeed(this.settings.speed);
        speedHeader.appendChild(speedLabelEl); speedHeader.appendChild(speedValue); speedSection.appendChild(speedHeader);
        const slider = document.createElement("input");
        slider.type = "range"; slider.min = "1"; slider.max = "12"; slider.step = "0.5"; slider.value = this.settings.speed;
        slider.style.cssText = "width: 100%; accent-color: #5865f2; cursor: pointer;";
        slider.addEventListener("input", e => { this.settings.speed = parseFloat(e.target.value); speedValue.textContent = formatSpeed(this.settings.speed); updatePreview(); this.saveAndRefresh(); });
        speedSection.appendChild(slider);
        const speedHint = document.createElement("div");
        speedHint.textContent = "Lower value = faster color cycle.";
        speedHint.style.cssText = "font-size: 11px; opacity: 0.4; margin-top: 4px;";
        speedSection.appendChild(speedHint);
        panel.appendChild(speedSection);
 
        panel.appendChild(mkDivider());
        panel.appendChild(mkSectionLabel("PER-SERVER TOGGLE"));
 
        const serverWrap = document.createElement("div");
        serverWrap.style.cssText = "margin-bottom: 20px;";
 
        const buildServerRow = () => {
            serverWrap.innerHTML = "";
            const guildId = this._currentGuildId();
 
            if (!guildId) {
                const note = document.createElement("div");
                note.textContent = "Open a server (not DMs) to toggle it here.";
                note.style.cssText = "font-size: 12px; opacity: 0.4; font-style: italic;";
                serverWrap.appendChild(note);
                return;
            }
 
            let guildName = "Unknown Server";
            try {
                guildName = BdApi.Webpack.getStore("GuildStore")?.getGuild(guildId)?.name ?? guildName;
            } catch(e) {}
 
            const row = document.createElement("div");
            row.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border-radius: 6px; padding: 10px 14px;";
 
            const nameEl = document.createElement("span");
            nameEl.textContent = guildName;
            nameEl.style.cssText = "font-size: 14px; font-weight: 600;";
 
            const toggleBtn = document.createElement("button");
            toggleBtn.style.cssText = "border: 1px solid; border-radius: 4px; padding: 5px 14px; cursor: pointer; font-size: 13px; font-weight: 600;";
 
            const refreshToggle = () => {
                const disabled = this.settings.disabledServers.includes(guildId);
                toggleBtn.textContent        = disabled ? "❌ Disabled" : "✅ Enabled";
                toggleBtn.style.background   = disabled ? "rgba(237,66,69,0.2)"   : "rgba(87,242,135,0.15)";
                toggleBtn.style.borderColor  = disabled ? "#ed4245"               : "#57f287";
                toggleBtn.style.color        = disabled ? "#ed4245"               : "#57f287";
            };
            refreshToggle();
 
            toggleBtn.addEventListener("click", () => {
                const idx = this.settings.disabledServers.indexOf(guildId);
                if (idx === -1) this.settings.disabledServers.push(guildId);
                else           this.settings.disabledServers.splice(idx, 1);
                refreshToggle();
                this.saveAndRefresh();
                const nowDisabled = this.settings.disabledServers.includes(guildId);
                BdApi.UI.showToast(nowDisabled ? `Disabled in ${guildName}` : `Enabled in ${guildName}`, { type: "info" });
            });
 
            row.appendChild(nameEl);
            row.appendChild(toggleBtn);
            serverWrap.appendChild(row);
        };
 
        buildServerRow();
        panel.appendChild(serverWrap);
 
        setTimeout(() => {
            if (!panel.parentElement) return;
            const obs = new MutationObserver(() => {
                if (!panel.isConnected) { previewStyleEl?.remove(); previewStyleEl = null; obs.disconnect(); }
            });
            obs.observe(panel.parentElement, { childList: true });
        }, 0);
 
        return panel;
    }
};
