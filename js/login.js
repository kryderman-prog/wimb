/**
 * /js/login.js
 * Google Identity Services login flow for login.html
 */

(function () {
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

            $.ajax({
                url: "/api/auth/google",
                method: "POST",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({ google_id, username, firstname, email, picture }),
                success: function () {
                    localStorage.setItem("wimb_logged_in", "true");
                    localStorage.setItem("wimb_user_name", username || firstname || "User");
                    window.location.href = "dashboard.html";
                },
                error: function (xhr) {
                    const msg =
                        (xhr && xhr.responseJSON && (xhr.responseJSON.error || xhr.responseJSON.message)) ||
                        (xhr && xhr.responseText) ||
                        "Google login failed.";
                    alert(msg);
                },
            });
        } catch (err) {
            console.error(err);
            alert("Google login failed.");
        }
    };
})();
