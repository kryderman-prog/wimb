/**
 * /js/user-search.js
 * User search functionality for dashboard.html
 */

try {
    console.log('user-search.js loaded');

    $(document).ready(function() {
        console.log('DOM ready');

        // Check config
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('Supabase config missing: SUPABASE_URL or SUPABASE_ANON_KEY undefined');
            return;
        }

        const loggedInUser = JSON.parse(localStorage.getItem("sessionUser"));
        console.log('Logged in user:', loggedInUser);
        if (!loggedInUser) {
            console.log('No logged in user, exiting');
            return;
        }

        let loggedInId = null;

        // Get logged in user's id (async, don't block)
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
                console.log('Logged in ID fetched:', loggedInId);
            }
        })
        .catch(err => console.error('Failed to fetch logged in ID:', err));

        let searchTimeout;

        // Delegated event binding
        $(document).on('keyup', '#user-search-input', function() {
            const value = $(this).val().trim();
            console.log("keyup working", value);
            //clearTimeout(searchTimeout);
            if (value.length < 2) {
                if ($('#user-search-results').length) {
                    $('#user-search-results').empty();
                }
                return;
            }
            // searchTimeout = setTimeout(() => {
            //     performSearch(value);
            // }, 300);
        });

        async function performSearch(query) {
            try {
                console.log('Performing search for:', query);
                if (!$('#user-search-results').length) {
                    console.error('Results container not found');
                    return;
                }
                $('#user-search-results').html('<div class="loading">Searching...</div>');
                const url = SUPABASE_URL + "/rest/v1/users?firstname=ilike.*" + query + "*&select=id,username,firstname&limit=10";
                const response = await fetch(url, {
                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": "Bearer " + SUPABASE_ANON_KEY
                    }
                });
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error('API error: ' + response.status);
                }
                const data = await response.json();
                console.log('Search results:', data);
                renderResults(data);
            } catch (err) {
                console.error('Search error:', err);
                if ($('#user-search-results').length) {
                    $('#user-search-results').html('<div class="error">Search failed</div>');
                }
            }
        }

        function renderResults(users) {
            // Exclude logged-in user if ID available
            let filteredUsers = users;
            if (loggedInId) {
                filteredUsers = users.filter(user => user.id !== loggedInId);
            }
            console.log('Filtered results:', filteredUsers);
            if (!$('#user-search-results').length) {
                console.error('Results container not found during render');
                return;
            }
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
} catch (err) {
    console.error('user-search.js crashed:', err);
}