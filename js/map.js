/**
 * /js/map.js
 * Handles the initialization and logic for Leaflet + OpenStreetMap.
 * Integrates browser Geolocation API to show user's current location.
 */

$(document).ready(function () {
    // Only initialize map if we are on a page where #map exists
    if ($("#map").length > 0) {

        // Configuration
        const MAP_CENTER_LAT = 9.9312; // Kochi, Kerala (default)
        const MAP_CENTER_LNG = 76.2673; // Kochi, Kerala (default)
        const MAP_ZOOM_LEVEL = 13;
        const USER_ZOOM_LEVEL = 15; // Closer zoom when user location is detected

        // 1. Initialize Map with default location
        const map = L.map('map').setView([MAP_CENTER_LAT, MAP_CENTER_LNG], MAP_ZOOM_LEVEL);

        // 2. Load OpenStreetMap tiles into map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // 3. Add Custom Marker indicating WIMB location
        const marker = L.marker([MAP_CENTER_LAT, MAP_CENTER_LNG], { title: "WIMB" }).addTo(map);

        // 4. Bind Popup and open by default
        marker.bindPopup("<div style='text-align:center;'><b>WIMB</b><br>WIMB Location</div>").openPopup();

        // 5. Request user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success Callback: User allowed location permission
                function (position) {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;

                    // Recenter map to user's location
                    map.setView([userLat, userLng], USER_ZOOM_LEVEL);

                    // Remove the default WIMB marker
                    map.removeLayer(marker);

                    // Add a new marker at user's location
                    const userMarker = L.marker([userLat, userLng], { title: "Your Location" }).addTo(map);

                    // Bind and open popup for user location
                    userMarker.bindPopup("<div style='text-align:center;'><b>You are here</b></div>").openPopup();

                    console.log("User location detected:", userLat, userLng);
                },
                // Error Callback: User denied location permission or error occurred
                function (error) {
                    console.log("Location access denied by user");
                    console.error("Geolocation error:", error.message);
                    // Map remains at default location (Kochi)
                }
            );
        } else {
            console.log("Geolocation API is not supported by this browser");
        }

        // Map Resizing Trigger: Sometimes Leaflet gets sizing issues inside hidden or flex containers
        // This ensures the map renders properly to fit container bounds.
        setTimeout(function () {
            map.invalidateSize();
        }, 300);
    }
});
