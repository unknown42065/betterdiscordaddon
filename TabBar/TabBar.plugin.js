/**
 * @name TabBar
 * @description Browser-style tab bar for Discord — drag to reorder, middle-click to close.
 * @version 0.4.0
 * @author Unknown654
 * @authorLink https://github.com/Unknown42065/
 * @website https://github.com/Unknown42065/BetterDiscordAddons
 * @updateUrl https://raw.githubusercontent.com/Unknown42065/BetterDiscordAddons/main/TabBar/TabBar.plugin.js
 * @source https://github.com/Unknown42065/BetterDiscordAddons/tree/main/TabBar
 */

module.exports = class TabBar {
    constructor() {
        this.tabs          = [];
        this.maxTabs       = 8;
        this.dragSrcIndex  = null;
        this.domObserver   = null;
        this.fluxUnsubscribe = null;
        this._retryFlux    = null;
    }
 
    _requireLib() {
        if (!window.Unknown654Lib) {
            BdApi.UI?.showToast?.("TabBar requires Unknown654Lib — please install it first.", { type: "error" });
            return false;
        }
        return true;
    }
 
    start() {
        if (!this._requireLib()) return;
        const Lib = window.Unknown654Lib;
 
        this.loadTabs();
        Lib.addStyle("TabBar", this._css());
        this._setupDomObserver();
 
        this._retryFlux = new Lib.Retry({
            interval: 500,
            maxTries: 20,
            onFail: () => Lib.showToast("TabBar: Could not find Dispatcher. Try Ctrl+R.", { type: "error" }),
        });
 
        this._retryFlux.start(() => {
            const Dispatcher = Lib.getDispatcher();
            if (!Dispatcher) return false;
 
            this._onChannelSelect = ({ channelId, guildId }) => {
                if (channelId) this._addOrActivateTab(channelId, guildId || null);
            };
            Dispatcher.subscribe("CHANNEL_SELECT", this._onChannelSelect);
            this.fluxUnsubscribe = () => Dispatcher.unsubscribe("CHANNEL_SELECT", this._onChannelSelect);
            return true;
        });
 
        const SelectedChannelStore = Lib.findModule("getChannelId", "getLastSelectedChannelId");
        const SelectedGuildStore   = Lib.findModule("getGuildId",   "getLastSelectedGuildId");
        const channelId = SelectedChannelStore?.getChannelId();
        const guildId   = SelectedGuildStore?.getGuildId();
        if (channelId) this._addOrActivateTab(channelId, guildId);
    }
 
    stop() {
        if (!window.Unknown654Lib) return;
        const Lib = window.Unknown654Lib;
 
        Lib.removeStyle("TabBar");
        this.fluxUnsubscribe?.();
        this.domObserver?.disconnect();
        this._retryFlux?.stop();
        this._removeBar();
    }
 
    loadTabs() {
        try { this.tabs = JSON.parse(localStorage.getItem("TabBar_tabs") || "[]"); }
        catch { this.tabs = []; }
    }
 
    _saveTabs() {
        localStorage.setItem("TabBar_tabs", JSON.stringify(this.tabs));
    }
 
    _getChannelInfo(channelId, guildId) {
        const Lib         = window.Unknown654Lib;
        const ChannelStore = Lib.findModule("getChannel", "getDMFromUserId");
        const GuildStore   = Lib.findModule("getGuild",   "getGuilds");
        const channel = ChannelStore?.getChannel(channelId);
        const guild   = guildId ? GuildStore?.getGuild(guildId) : null;
 
        let channelName = "unknown";
        if (channel) {
            if (channel.name) {
                channelName = channel.name;
            } else if (channel.type === 1) {
                const UserStore = Lib.findModule("getUser", "getCurrentUser");
                const recipient = channel.recipients?.[0];
                const user      = recipient ? UserStore?.getUser(recipient) : null;
                channelName     = user?.username || "DM";
            }
        }
 
        return {
            channelId,
            guildId:     guildId || null,
            channelName,
            guildName:   guild?.name || "DMs",
            guildIcon:   guild?.icon
                            ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.webp?size=16`
                            : null,
            isDM: !guildId,
        };
    }
 
    _addOrActivateTab(channelId, guildId) {
        const existing = this.tabs.findIndex(t => t.channelId === channelId);
 
        if (existing !== -1) {
            this.tabs.forEach((t, i) => { t.active = (i === existing); });
        } else {
            this.tabs.forEach(t => { t.active = false; });
            const info = this._getChannelInfo(channelId, guildId);
            this.tabs.push({ ...info, active: true });
 
            if (this.tabs.length > this.maxTabs) {
                const evict = this.tabs.findIndex(t => !t.active);
                if (evict !== -1) this.tabs.splice(evict, 1);
            }
        }
 
        this._saveTabs();
        this._renderBar();
    }
 
    _removeTab(channelId) {
        const idx = this.tabs.findIndex(t => t.channelId === channelId);
        if (idx === -1) return;
 
        const wasActive = this.tabs[idx].active;
        this.tabs.splice(idx, 1);
 
        if (wasActive && this.tabs.length > 0) {
            const next = this.tabs[Math.max(0, idx - 1)];
            next.active = true;
            window.Unknown654Lib.navigate(next.channelId, next.guildId);
        }
 
        this._saveTabs();
        this._renderBar();
    }
 
    _setupDomObserver() {
        this.domObserver = new MutationObserver(() => {
            if (!document.getElementById("tabbar-root")) this._renderBar();
        });
        this.domObserver.observe(document.body, { childList: true, subtree: true });
    }
 
    _getChatColumn() {
        return (
            document.querySelector('[class*="chatContent-"]') ||
            document.querySelector('[class*="chat-"]')         ||
            document.querySelector('[class*="content-"] > [class*="chat"]')
        );
    }
 
    _removeBar() {
        document.getElementById("tabbar-root")?.remove();
    }
 
    _renderBar() {
        let bar = document.getElementById("tabbar-root");
        if (!bar) {
            const chatCol = this._getChatColumn();
            if (!chatCol) return;
            chatCol.style.display       = "flex";
            chatCol.style.flexDirection = "column";
 
            bar = document.createElement("div");
            bar.id = "tabbar-root";
            chatCol.insertBefore(bar, chatCol.firstChild);
        }
 
        bar.innerHTML = "";
 
        this.tabs.forEach((tab, index) => {
            const el = document.createElement("div");
            el.className   = `tabbar-tab${tab.active ? " active" : ""}`;
            el.draggable   = true;
            el.dataset.idx = index;
 
            if (tab.guildIcon) {
                const img = document.createElement("img");
                img.src       = tab.guildIcon;
                img.className = "tabbar-icon";
                img.onerror   = () => img.remove();
                el.appendChild(img);
            } else {
                const dot = document.createElement("span");
                dot.className = "tabbar-dot";
                el.appendChild(dot);
            }
 
            const name = document.createElement("span");
            name.className   = "tabbar-name";
            name.textContent = tab.channelName;
            name.title       = `#${tab.channelName}  —  ${tab.guildName}`;
            el.appendChild(name);
 
            const close = document.createElement("span");
            close.className   = "tabbar-close";
            close.textContent = "✕";
            close.title       = "Close tab";
            el.appendChild(close);
 
            el.addEventListener("click", e => {
                if (close.contains(e.target)) return;
                window.Unknown654Lib.navigate(tab.channelId, tab.guildId);
            });
 
            close.addEventListener("click", e => {
                e.stopPropagation();
                this._removeTab(tab.channelId);
            });
 
            el.addEventListener("auxclick", e => {
                if (e.button === 1) this._removeTab(tab.channelId);
            });
 
            el.addEventListener("dragstart", e => {
                this.dragSrcIndex = index;
                e.dataTransfer.effectAllowed = "move";
                setTimeout(() => el.classList.add("dragging"), 0);
            });
 
            el.addEventListener("dragend", () => {
                el.classList.remove("dragging");
                bar.querySelectorAll(".drag-over").forEach(t => t.classList.remove("drag-over"));
            });
 
            el.addEventListener("dragover", e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (index !== this.dragSrcIndex) el.classList.add("drag-over");
            });
 
            el.addEventListener("dragleave", () => {
                el.classList.remove("drag-over");
            });
 
            el.addEventListener("drop", e => {
                e.preventDefault();
                el.classList.remove("drag-over");
                if (this.dragSrcIndex === null || this.dragSrcIndex === index) return;
 
                const moved = this.tabs.splice(this.dragSrcIndex, 1)[0];
                this.tabs.splice(index, 0, moved);
                this.dragSrcIndex = null;
                this._saveTabs();
                this._renderBar();
            });
 
            bar.appendChild(el);
        });
    }
 
    _css() {
        return `
            #tabbar-root {
                display:         flex;
                align-items:     center;
                background:      var(--background-secondary);
                border-bottom:   1px solid var(--background-tertiary);
                padding:         0 6px;
                height:          36px;
                flex-shrink:     0;
                overflow-x:      auto;
                overflow-y:      hidden;
                scrollbar-width: none;
                gap:             2px;
                z-index:         10;
            }
            #tabbar-root::-webkit-scrollbar { display: none; }
 
            .tabbar-tab {
                display:       flex;
                align-items:   center;
                gap:           5px;
                padding:       0 6px 0 7px;
                height:        27px;
                border-radius: 5px;
                cursor:        pointer;
                font-size:     12px;
                font-weight:   500;
                color:         var(--text-muted);
                white-space:   nowrap;
                user-select:   none;
                flex-shrink:   0;
                max-width:     170px;
                transition:    background 0.12s, color 0.12s, border-color 0.12s;
                border:        1px solid transparent;
            }
            .tabbar-tab:hover {
                background: var(--background-modifier-hover);
                color:      var(--text-normal);
            }
            .tabbar-tab.active {
                background:   var(--background-primary);
                color:        var(--text-normal);
                border-color: var(--background-floating);
                box-shadow:   0 1px 3px rgba(0,0,0,0.2);
            }
            .tabbar-tab.dragging  { opacity: 0.35; }
            .tabbar-tab.drag-over { border-color: var(--brand-experiment); }
 
            .tabbar-icon {
                width:         14px;
                height:        14px;
                border-radius: 3px;
                flex-shrink:   0;
            }
            .tabbar-dot {
                width:         7px;
                height:        7px;
                border-radius: 50%;
                background:    var(--brand-experiment);
                opacity:       0.5;
                flex-shrink:   0;
            }
 
            .tabbar-name {
                overflow:      hidden;
                text-overflow: ellipsis;
                flex:          1;
                min-width:     0;
            }
            .tabbar-name::before {
                content:      '#';
                opacity:      0.45;
                margin-right: 1px;
            }
            .tabbar-tab.active .tabbar-name::before { opacity: 0.6; }
 
            .tabbar-close {
                display:         flex;
                align-items:     center;
                justify-content: center;
                width:           14px;
                height:          14px;
                border-radius:   3px;
                flex-shrink:     0;
                font-size:       9px;
                opacity:         0;
                transition:      opacity 0.1s, color 0.1s, background 0.1s;
                margin-left:     1px;
                line-height:     1;
            }
            .tabbar-tab:hover .tabbar-close,
            .tabbar-tab.active .tabbar-close { opacity: 0.5; }
            .tabbar-close:hover              { opacity: 1 !important; color: var(--text-danger); }
        `;
    }
};
 
