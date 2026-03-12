/**
 * /js/login.js
 * Google Identity Services login flow for login.html
 */

(function () {
    const SUPABASE_URL = "https://sbdxqulufdxkpdccygza.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZHhxdWx1ZmR4a3BkY2N5Z3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY5OTUsImV4cCI6MjA4ODc3Mjk5NX0.ptuB8FxnLJ9wgoAVPxGzb1CIbWkpENp5oHFN-IzOhD8";

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

            const google_id = payload.sub || "";
            const username = payload.name || "";
            const firstname = payload.given_name || "";
            const email = payload.email || "";
            const picture = payload.picture || "";

            if (!google_id || !email) throw new Error("Incomplete Google profile");

            if (SUPABASE_URL === "https://sbdxqulufdxkpdccygza.supabase.co" || SUPABASE_ANON_KEY === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZHhxdWx1ZmR4a3BkY2N5Z3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY5OTUsImV4cCI6MjA4ODc3Mjk5NX0.ptuB8FxnLJ9wgoAVPxGzb1CIbWkpENp5oHFN-IzOhD8") {
                alert("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/login.js.");
                return;
            }

            const user = { google_id, username, firstname, email, picture };

            fetch(`${SUPABASE_URL.replace(/\\/$/, "")}/rest/v1/users?on_conflict=google_id`, {
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
                    localStorage.setItem("wimb_logged_in", "true");
                    localStorage.setItem("wimb_user_name", username || firstname || "User");
                    localStorage.setItem("wimb_user_email", email);
                    localStorage.setItem("wimb_user_picture", picture);
                    window.location.href = "dashboard.html";
                })
                .catch((err) => {
                    console.error(err);
                    alert("Google login failed.");
                });
        } catch (err) {
            console.error(err);
            alert("Google login failed.");
        }
    };
})();
