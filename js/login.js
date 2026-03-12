/**
 * /js/login.js
 * Google Identity Services login flow for login.html
 */

(function () {
    // configuration values are defined in js/config.js and must not be
    // redeclared here.  config.js is loaded before this script in login.html.
    // We'll perform a quick sanity check later to ensure they have been
    // replaced from their placeholder values.

    function decodeJwtPayload(jwt) {
        const parts = String(jwt || "").split(".");
        if (parts.length < 2) return null;

        let base64Url = parts[1];
        base64Url = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const pad = base64Url.length % 4;
        if (pad) base64Url += "=".repeat(4 - pad);

        try {
            const json = atob(base64Url);
            const bytes = Array.prototype.map.call(json, (c) =>
                "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
            ).join("");
            return JSON.parse(decodeURIComponent(bytes));
        } catch (err) {
            console.error("Failed to decode Google JWT payload", err);
            return null;
        }
    }

    // Google Identity Services callback (referenced by data-callback in login.html)
    window.handleCredentialResponse = function handleCredentialResponse(response) {
        try {
            const jwt = response && response.credential;
            if (!jwt) throw new Error("Missing credential");

            const payload = decodeJwtPayload(jwt);
            if (!payload) throw new Error("Invalid credential payload");

            // DEBUGGING: show every major field returned by Google
            try {
                alert("Google ID: " + payload.sub);
                alert("Name: " + payload.name);
                alert("Given Name: " + payload.given_name);
                alert("Email: " + payload.email);
                alert("Picture: " + payload.picture);
                alert("Full Google Payload: " + JSON.stringify(payload, null, 2));
            } catch (dbgErr) {
                console.error("Debug alerts failed", dbgErr);
            }

            const google_id = payload.sub || "";
            const username = payload.name || "";
            const firstname = payload.given_name || "";
            const email = payload.email || "";
            const picture = payload.picture || "";

            if (!google_id || !email) throw new Error("Incomplete Google profile");

            // ensure the configuration constants have been provided
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
                SUPABASE_URL === "REPLACE_ME" || SUPABASE_ANON_KEY === "REPLACE_ME") {
                alert("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.");
                return;
            }

            const user = { google_id, username, firstname, email, picture };

            fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/users?on_conflict=google_id`, {
                method: "POST",
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json",
                    Prefer: "resolution=merge-duplicates",
                },
                body: JSON.stringify([user]),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const text = await res.text().catch(() => "");
                        throw new Error(text || `Supabase upsert failed (${res.status})`);
                    }
                    localStorage.setItem("wimb_user", JSON.stringify(user));
                    localStorage.setItem("wimb_logged_in", "true");
                    localStorage.setItem("wimb_user_name", username || firstname || "User");
                    localStorage.setItem("wimb_user_email", email);
                    localStorage.setItem("wimb_user_picture", picture);
                    window.location.href = "dashboard.html";
                })
                .catch((err) => {
                    console.error(err);
                    alert("Google login failed");
                });
        } catch (err) {
            console.error(err);
            alert("Google login failed");
        }
    };
})();
