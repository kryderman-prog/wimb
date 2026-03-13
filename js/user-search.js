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

        if (!Array.isArray(users) || users.length === 0) {
            $("#user-search-results").html("<div>No users found</div>");
            return;
        }

        const html = users
            .map((user) => {
                const username = (user && user.username) ? user.username : "";
                const firstname = (user && user.firstname) ? user.firstname : "";
                return `<div class="search-result-item">${username} (${firstname})</div>`;
            })
            .join("");

        $("#user-search-results").html(html);
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

    // Start loading config early (dashboard.html may not include it)
    loadSupabaseConfigIfMissing();
})();
