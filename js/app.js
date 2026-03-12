/**
 * /js/app.js
 * Handles authentication, session management, and common app logic.
 */

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
