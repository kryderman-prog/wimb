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
        console.log("Logged in user:", loggedInUser);
        // Allow search even if not logged in

        let searchTimer;

        // Delegated event binding
        $(document).on('keyup', '#user-search-input', function() {
            const value = $(this).val().trim();
            console.log("keyup working", value);
            clearTimeout(searchTimer);
            if (value.length < 2) {
                if ($('#user-search-results').length) {
                    $('#user-search-results').empty();
                }
                return;
            }
            searchTimer = setTimeout(() => {
                performSearch(value);
            }, 300);
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
            console.log('Rendering results:', users);
            if (!$('#user-search-results').length) {
                console.error('Results container not found during render');
                return;
            }
            if (users.length === 0) {
                $('#user-search-results').html('<div>No users found</div>');
                return;
            }
            let html = '';
            users.forEach(user => {
                html += `<div class="search-result-item">
                    ${user.username} (${user.firstname})
                </div>`;
            });
            $('#user-search-results').html(html);
        }
    });
} catch (err) {
    console.error('user-search.js crashed:', err);
}