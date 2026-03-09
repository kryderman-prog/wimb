/**
 * /js/app.js
 * Handles authentication, session management, and common app logic.
 */

// Function required by Google Identity Services to handle the custom callback
function handleCredentialResponse(response) {
    // 1. Decode JWT token sent back by Google
    const data = parseJwt(response.credential);

    // 2. Extract user info
    const userName = data.name || "User";

    // 3. Save login state in localStorage
    localStorage.setItem("wimb_logged_in", "true");
    localStorage.setItem("wimb_user_name", userName);

    // 4. Redirect to dashboard page
    window.location.href = "dashboard.html";
}

// Helper to decode JWT directly on client-side
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Decode failed", e);
        return {};
    }
}

// App Initialization logic when DOM is ready
$(document).ready(function () {
    const path = window.location.pathname;

    // --- Index Page Logic ---
    if (path.endsWith('index.html') || path.endsWith('/wimb') || path.endsWith('/wimb/')) {
        $('#login-redirect-btn').on('click', function () {
            window.location.href = "login.html";
        });
    }

    // --- Login Page Logic ---
    if (path.endsWith('login.html')) {
        // Prevent logged-in users from seeing the login page
        if (localStorage.getItem("wimb_logged_in") === "true") {
            window.location.href = "dashboard.html";
        }

        // Developer Test Login Logic
        $("#devLogin").click(function () {
            localStorage.setItem("wimb_logged_in", "true");
            localStorage.setItem("wimb_user_name", "Developer");
            window.location.href = "dashboard.html";
        });
    }

    // --- Dashboard Page Logic ---
    if (path.endsWith('dashboard.html')) {
        // Protect Dashboard: Check login status
        if (localStorage.getItem("wimb_logged_in") !== "true") {
            window.location.href = "login.html";
            return;
        }

        // Display Welcome Message securely
        $("#username").text(localStorage.getItem("wimb_user_name"));

        // Handle logout
        $("#logout").click(function () {
            localStorage.removeItem("wimb_logged_in");
            localStorage.removeItem("wimb_user_name");
            window.location.href = "login.html";
        });
    }
});
