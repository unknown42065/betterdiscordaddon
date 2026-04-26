/**
 * @name Unknown654Lib
 * @description Shared utility library for Unknown654's BetterDiscord plugins.
 * @version 1.1.1
 * @author Unknown654
 * @authorLink https://github.com/Unknown42065/
 * @website https://github.com/Unknown42065/BetterDiscordAddons
 * @updateUrl https://raw.githubusercontent.com/Unknown42065/BetterDiscordAddons/main/Unknown654Lib/Unknown654Lib.plugin.js
 * @source https://github.com/Unknown42065/BetterDiscordAddons/tree/main/Unknown654Lib
 */

module.exports = class Unknown654Lib {

    start() {
        window.Unknown654Lib = this._buildApi();
    }

    stop() {
        delete window.Unknown654Lib;
    }

    getSettingsPanel() {
        const el = document.createElement("p");
        el.style.cssText = "padding:16px;color:var(--text-normal);font-size:14px;";
        el.textContent = "This is a shared utility library. It has no settings of its own.";
        return el;
    }

    _buildApi() {
        return {

            findModule(...props) {
                if (BdApi.Webpack?.getModule) {
                    return BdApi.Webpack.getModule(
                        m => props.every(p => m?.[p] !== undefined)
                    ) ?? null;
                }
                return BdApi.findModuleByProps?.(...props) ?? null;
            },

            getDispatcher() {
                if (BdApi.Webpack?.getByKeys) {
                    const m = BdApi.Webpack.getByKeys("dispatch", "subscribe");
                    if (m) return m;
                }
                if (BdApi.Webpack?.getModule) {
                    const m = BdApi.Webpack.getModule(
                        m => typeof m?.dispatch    === "function" &&
                             typeof m?.subscribe   === "function" &&
                             typeof m?.unsubscribe === "function"
                    );
                    if (m) return m;
                }
                return BdApi.findModuleByProps?.("dispatch", "subscribe") ?? null;
            },

            getStore(name) {
                try {
                    return BdApi.Webpack?.getStore?.(name) ?? null;
                } catch {
                    return null;
                }
            },

            addStyle(id, css) {
                if (BdApi.DOM?.addStyle) BdApi.DOM.addStyle(id, css);
                else BdApi.injectCSS?.(id, css);
            },

            removeStyle(id) {
                if (BdApi.DOM?.removeStyle) BdApi.DOM.removeStyle(id);
                else BdApi.clearCSS?.(id);
            },

            loadData(pluginName, key, fallback = null) {
                return BdApi.Data?.load(pluginName, key) ?? fallback;
            },

            saveData(pluginName, key, value) {
                BdApi.Data?.save(pluginName, key, value);
            },

            showToast(message, opts = {}) {
                BdApi.UI?.showToast?.(message, opts);
            },

            // FIX: broadened module search so it works for both guild channels
            // and DMs, and added a legacy fallback for older BD versions.
            navigate(channelId, guildId) {
                let Nav = null;

                // Prefer getByKeys (fastest path)
                if (BdApi.Webpack?.getByKeys) {
                    try { Nav = BdApi.Webpack.getByKeys("transitionToGuild", "transitionTo"); } catch {}
                }

                // Fall back to scanning modules
                if (!Nav && BdApi.Webpack?.getModule) {
                    Nav = BdApi.Webpack.getModule(
                        m => typeof m?.transitionToGuild === "function" &&
                             typeof m?.transitionTo      === "function"
                    );
                }

                // Legacy BD API fallback
                if (!Nav) Nav = BdApi.findModuleByProps?.("transitionToGuild", "transitionTo") ?? null;

                if (!Nav) return;

                if (guildId) Nav.transitionToGuild?.(guildId, channelId);
                else         Nav.transitionTo?.(`/channels/@me/${channelId}`);
            },

            Retry: class Retry {
                constructor({ interval = 500, maxTries = 20, onFail = null } = {}) {
                    this._interval = interval;
                    this._maxTries = maxTries;
                    this._onFail   = onFail;
                    this._count    = 0;
                    this._timer    = null;
                }

                start(fn) {
                    this.stop();
                    const attempt = () => {
                        const done = fn();
                        if (done) return;
                        if (this._count < this._maxTries) {
                            this._count++;
                            this._timer = setTimeout(attempt, this._interval);
                        } else {
                            this._onFail?.();
                        }
                    };
                    attempt();
                }

                stop() {
                    clearTimeout(this._timer);
                    this._timer = null;
                    this._count = 0;
                }
            },
        };
    }
};
};
