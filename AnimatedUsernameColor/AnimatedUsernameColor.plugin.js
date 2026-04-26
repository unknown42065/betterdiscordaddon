/**
 * @name AnimatedUsernameColor
 * @description Animates your own username color in chat with customizable colors, speed, and font.
 * @version 2.3.3
 * @author Unknown654#0
 * @website https://github.com/Unknown42065/BetterDiscordAddon
 * @updateUrl https://raw.githubusercontent.com/Unknown42065/BetterDiscordAddon/main/AnimatedUsernameColor/AnimatedUsernameColor.plugin.js
 * @source    https://github.com/Unknown42065/BetterDiscordAddon/tree/main/AnimatedUsernameColor
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

module.exports = class AnimatedUsernameColor {

    constructor() {
        this.defaultSettings = {
            colors: ["#ff4444", "#ff9900", "#ffff00", "#44ff44", "#4488ff", "#aa44ff"],
            speed:  4,
            font:   ""
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
                : [...this.defaultSettings.colors]
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
        const stops  = colors.map((c, i) =>
            `${Math.round((i / colors.length) * 100)}% { color: ${c}; }`
        );
        stops.push(`100% { color: ${colors[0]}; }`);
        BdApi.DOM.removeStyle(PLUGIN_NAME);
        BdApi.DOM.addStyle(PLUGIN_NAME, `@keyframes auc-cycle { ${stops.join(" ")} }`);
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

    _scanForNames(root) {
        if (!root || root.nodeType !== 1) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        while (node) {
            if (node.childElementCount <= 2) {
                const text = node.textContent?.trim();
                if (text && this._isOurName(text)) {
                    this._applyStyle(node);
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
        document.querySelectorAll("[data-auc]").forEach(el => this._applyStyle(el));
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

        const previewWrap = document.createElement("div");
        previewWrap.style.cssText = "margin-bottom: 20px;";
        const previewLabel = document.createElement("div");
        previewLabel.textContent = "PREVIEW";
        previewLabel.style.cssText = "font-size: 11px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.5; margin-bottom: 6px;";
        previewWrap.appendChild(previewLabel);
        const preview = document.createElement("span");
        preview.id = previewId;
        preview.textContent = this.currentUser?.username ?? "YourUsername";
        preview.style.cssText = "font-size: 20px; font-weight: 700; display: inline-block;";
        previewWrap.appendChild(preview);
        panel.appendChild(previewWrap);

        const updatePreview = () => {
            const colors = this.settings.colors;
            if (colors.length < 2) return;
            const stops = colors.map((c, i) => `${Math.round((i / colors.length) * 100)}% { color: ${c}; }`);
            stops.push(`100% { color: ${colors[0]}; }`);
            const font = this.settings.font;
            if (!previewStyleEl) { previewStyleEl = document.createElement("style"); document.head.appendChild(previewStyleEl); }
            previewStyleEl.textContent = `
                @keyframes auc-prev-${previewId} { ${stops.join(" ")} }
                #${previewId} {
                    animation: auc-prev-${previewId} ${this.settings.speed}s linear infinite;
                    ${font ? `font-family: '${font}', sans-serif;` : ""}
                }
            `;
        };
        updatePreview();

        const colorsLabel = document.createElement("div");
        colorsLabel.textContent = "COLORS";
        colorsLabel.style.cssText = "font-size: 11px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.5; margin-bottom: 10px;";
        panel.appendChild(colorsLabel);
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
        resetBtn.addEventListener("click", () => { this.settings.colors = [...this.defaultSettings.colors]; updatePreview(); this.saveAndRefresh(); renderColors(); BdApi.UI.showToast("Colors reset!", { type: "success" }); });
        panel.appendChild(resetBtn);

        const divider = document.createElement("div");
        divider.style.cssText = "border-top: 1px solid rgba(255,255,255,0.08); margin: 4px 0 20px 0;";
        panel.appendChild(divider);
        const fontSectionLabel = document.createElement("div");
        fontSectionLabel.textContent = "FONT";
        fontSectionLabel.style.cssText = "font-size: 11px; font-weight: 700; letter-spacing: 0.8px; opacity: 0.5; margin-bottom: 10px;";
        panel.appendChild(fontSectionLabel);
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

        const divider2 = document.createElement("div");
        divider2.style.cssText = "border-top: 1px solid rgba(255,255,255,0.08); margin: 4px 0 20px 0;";
        panel.appendChild(divider2);
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

        setTimeout(() => {
            if (!panel.parentElement) return;
            const obs = new MutationObserver(() => { if (!panel.isConnected) { previewStyleEl?.remove(); previewStyleEl = null; obs.disconnect(); } });
            obs.observe(panel.parentElement, { childList: true });
        }, 0);

        return panel;
    }
};
