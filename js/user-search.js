/**
 * /js/user-search.js
 * User search functionality for dashboard.html
 */

$(document).ready(function() {
    const loggedInUser = JSON.parse(localStorage.getItem("wimb_user"));
    if (!loggedInUser) return; // not logged in

    let loggedInId = null;

    // Get logged in user's id
    fetch(SUPABASE_URL + "/rest/v1/users?google_id=eq." + loggedInUser.google_id + "&select=id", {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.length > 0) {
            loggedInId = data[0].id;
        }
    });

    let searchTimeout;

    $('#user-search-input').on('keyup', function() {
        clearTimeout(searchTimeout);
        const query = $(this).val().trim();
        if (query.length < 2) {
            $('#user-search-results').empty();
            return;
        }
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    function performSearch(query) {
        $('#user-search-results').html('<div class="loading">Searching...</div>');
        const url = SUPABASE_URL + "/rest/v1/users?or=(username.ilike.%25" + encodeURIComponent(query) + "%25,firstname.ilike.%25" + encodeURIComponent(query) + "%25)&select=id,username,firstname&limit=10&google_id=neq." + loggedInUser.google_id;
        fetch(url, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + SUPABASE_ANON_KEY
            }
        })
        .then(res => res.json())
        .then(data => {
            renderResults(data);
        })
        .catch(err => {
            console.error(err);
            $('#user-search-results').html('<div class="error">Search failed</div>');
        });
    }

    function renderResults(users) {
        if (users.length === 0) {
            $('#user-search-results').html('<div class="no-results">No users found</div>');
            return;
        }
        let html = '';
        users.forEach(user => {
            html += `<div class="search-result-item">
                <div class="user-name">${user.username} (${user.firstname})</div>
                <button class="add-circle-btn" data-userid="${user.id}">Add to Circle</button>
            </div>`;
        });
        $('#user-search-results').html(html);
    }

    $(document).on('click', '.add-circle-btn', function() {
        const userId = $(this).data('userid');
        addToCircle(userId);
    });

    function addToCircle(userId) {
        // Fetch user's circles
        fetch(SUPABASE_URL + "/rest/v1/circles?user_id=eq." + loggedInId + "&select=id,name", {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + SUPABASE_ANON_KEY
            }
        })
        .then(res => res.json())
        .then(circles => {
            if (circles.length === 0) {
                alert("You have no circles to add to.");
                return;
            }
            let circleId;
            if (circles.length === 1) {
                circleId = circles[0].id;
            } else {
                const circleNames = circles.map(c => c.name).join(', ');
                const selectedName = prompt("Select a circle: " + circleNames);
                const selectedCircle = circles.find(c => c.name === selectedName);
                if (!selectedCircle) {
                    alert("Invalid circle selected.");
                    return;
                }
                circleId = selectedCircle.id;
            }
            // Insert into circle_members
            fetch(SUPABASE_URL + "/rest/v1/circle_members", {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": "Bearer " + SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    circle_id: circleId,
                    user_id: userId,
                    joined_at: new Date().toISOString()
                })
            })
            .then(res => {
                if (res.ok) {
                    alert("User added to circle!");
                } else {
                    return res.text().then(text => {
                        if (text.includes("duplicate")) {
                            alert("User is already in this circle.");
                        } else {
                            alert("Failed to add user: " + text);
                        }
                    });
                }
            })
            .catch(err => {
                console.error(err);
                alert("Error adding user to circle.");
            });
        })
        .catch(err => {
            console.error(err);
            alert("Failed to fetch circles.");
        });
    }
});