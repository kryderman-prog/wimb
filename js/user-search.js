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

    async function performSearch(query) {
        console.log('Searching for:', query);
        $('#user-search-results').html('<div class="loading">Searching...</div>');
        const url = SUPABASE_URL + "/rest/v1/users?firstname=ilike.*" + query + "*&select=id,username,firstname&limit=10";
        try {
            const response = await fetch(url, {
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": "Bearer " + SUPABASE_ANON_KEY
                }
            });
            const data = await response.json();
            console.log('Search results:', data);
            renderResults(data);
        } catch (err) {
            console.error('Search error:', err);
            $('#user-search-results').html('<div class="error">Search failed</div>');
        }
    }

    function renderResults(users) {
        // Exclude logged-in user
        const filteredUsers = users.filter(user => user.id !== loggedInId);
        console.log('Filtered results:', filteredUsers);
        if (filteredUsers.length === 0) {
            $('#user-search-results').html('<div class="no-users">No users found</div>');
            return;
        }
        let html = '';
        filteredUsers.forEach(user => {
            html += `<div class="search-result-item">
                <span class="search-user-label">${user.username} (${user.firstname})</span>
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