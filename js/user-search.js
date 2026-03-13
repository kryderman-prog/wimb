/**
 * /js/user-search.js
 * User search functionality for dashboard.html
 */

console.log("user-search.js loaded");

// Debounce timer (global variable as required)
let searchTimer;

(function initUserSearch() {
    if (typeof window.jQuery === "undefined") {
        console.error("jQuery is not loaded; user search disabled");
        return;
    }

    let configLoadPromise = null;
    let activeRequestId = 0;

    function injectSearchStyles() {
        if (document.getElementById("wimb-user-search-styles")) return;

        const style = document.createElement("style");
        style.id = "wimb-user-search-styles";
        style.textContent = `
            #user-search-box { position: relative; min-width: 260px; }

            #user-search-input {
                width: 100%;
                padding: 0.65rem 0.9rem;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                outline: none;
                font-size: 0.95rem;
                background: var(--card-bg, #fff);
                color: var(--text-color, #111827);
            }

            #user-search-input:focus {
                border-color: rgba(15, 23, 42, 0.35);
                box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
            }

            #user-search-results {
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                right: 0;
                background: var(--card-bg, #fff);
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
                max-height: 320px;
                overflow: auto;
                z-index: 9999;
            }

            #user-search-results:empty { display: none; }

            #user-search-results > div:not(.search-result-item) {
                padding: 0.75rem 0.8rem;
                color: var(--text-muted, #6b7280);
                font-size: 0.95rem;
            }

            .search-result-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 0.65rem 0.8rem;
                border-bottom: 1px solid #f1f5f9;
            }

            .search-result-item:last-child { border-bottom: none; }
            .search-result-item:hover { background: #f8fafc; }

            .search-user-label {
                color: var(--text-color, #111827);
                font-size: 0.95rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .add-to-circle-btn {
                flex: 0 0 auto;
                padding: 0.45rem 0.7rem;
                border-radius: 10px;
                border: 1px solid transparent;
                background: var(--primary-color, #0f172a);
                color: #fff;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.05s ease, background 0.2s ease, opacity 0.2s ease;
            }

            .add-to-circle-btn:hover { background: var(--primary-hover, #1e293b); }
            .add-to-circle-btn:active { transform: translateY(1px); }
            .add-to-circle-btn:disabled { opacity: 0.7; cursor: not-allowed; }

            .add-to-circle-btn.selected-user { background: #16a34a; }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    function readSessionUser() {
        const raw = localStorage && localStorage.sessionUser;
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (err) {
            console.error("Failed to parse localStorage.sessionUser", err);
            return null;
        }
    }

    function getSupabaseConfig() {
        const url = typeof SUPABASE_URL === "undefined" ? null : SUPABASE_URL;
        const anonKey = typeof SUPABASE_ANON_KEY === "undefined" ? null : SUPABASE_ANON_KEY;
        return url && anonKey ? { url, anonKey } : null;
    }

    function loadSupabaseConfigIfMissing() {
        const existingConfig = getSupabaseConfig();
        if (existingConfig) return Promise.resolve(existingConfig);

        // Safety check log as required
        if (typeof SUPABASE_URL === "undefined") {
            console.error("SUPABASE_URL undefined");
        }

        if (configLoadPromise) return configLoadPromise;

        configLoadPromise = new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "js/config.js";
            script.async = true;
            script.onload = function () {
                resolve(getSupabaseConfig());
            };
            script.onerror = function () {
                console.error("Failed to load js/config.js");
                resolve(null);
            };
            (document.head || document.documentElement).appendChild(script);
        });

        return configLoadPromise;
    }

    function renderResults(users) {
        // Safety check as required
        if ($("#user-search-results").length === 0) {
            console.error("results container missing");
            return;
        }

        const $results = $("#user-search-results");

        if (!Array.isArray(users) || users.length === 0) {
            $results.html("<div>No users found</div>");
            return;
        }

        $results.empty();

        users.forEach((user) => {
            const userId = user && user.id ? String(user.id) : "";
            const username = user && user.username ? String(user.username) : "";
            const firstname = user && user.firstname ? String(user.firstname) : "";

            const $item = $("<div>").addClass("search-result-item");

            $("<span>")
                .addClass("search-user-label")
                .text(`${username} (${firstname})`)
                .appendTo($item);

            $("<button>")
                .addClass("add-to-circle-btn")
                .attr("data-userid", userId)
                .text("Add to Circle")
                .appendTo($item);

            $results.append($item);
        });
    }

    async function performSearch(query, requestId) {
        const $results = $("#user-search-results");
        if ($results.length === 0) {
            console.error("results container missing");
            return;
        }

        const config = await loadSupabaseConfigIfMissing();
        if (!config) {
            $results.html("<div>No users found</div>");
            return;
        }

        console.log("calling supabase search");

        const url =
            config.url +
            "/rest/v1/users?firstname=ilike.*" +
            query +
            "*&select=id,username,firstname&limit=10";

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    apikey: config.anonKey,
                    Authorization: "Bearer " + config.anonKey,
                },
            });

            let data;
            try {
                data = await response.json();
            } catch (_) {
                data = null;
            }

            console.log("search response:", data);

            if (!response.ok) {
                throw new Error("Supabase search failed: " + response.status);
            }

            // Ignore stale responses (user typed a new query)
            if (requestId !== activeRequestId) return;

            let users = Array.isArray(data) ? data : [];

            // Exclude current user only if sessionUser is present and has an id
            const sessionUser = readSessionUser();
            const sessionUserId = sessionUser && sessionUser.id ? String(sessionUser.id) : null;
            if (sessionUserId) {
                users = users.filter((u) => String(u && u.id) !== sessionUserId);
            }

            renderResults(users);
        } catch (err) {
            console.error("Search error:", err);
            if (requestId !== activeRequestId) return;
            $results.html("<div>No users found</div>");
        }
    }

    // Delegated event binding (works even if input is added later)
    $(document).on("keyup", "#user-search-input", function () {
        const query = String($(this).val() || "").trim();
        console.log("keyup working:", query);

        clearTimeout(searchTimer);

        if (query.length < 2) {
            $("#user-search-results").empty();
            return;
        }

        activeRequestId += 1;
        const requestId = activeRequestId;

        searchTimer = setTimeout(function () {
            performSearch(query, requestId);
        }, 300);
    });

    // Delegated click handling for "Add to Circle" buttons
    $(document).on("click", ".add-to-circle-btn", function () {
        const selectedUserId = $(this).data("userid");
        console.log("Add to circle clicked for user:", selectedUserId);

        $(this).text("Selected").prop("disabled", true).addClass("selected-user");
    });

    // Start loading config early (dashboard.html may not include it)
    injectSearchStyles();
    loadSupabaseConfigIfMissing();
})();
