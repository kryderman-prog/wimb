/*
 * /js/register.js
 * Manual registration form handler
 */

$(function () {
    // ensure configuration constants exist
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.error('Supabase configuration not found (js/config.js)');
        return;
    }

    $('#registerForm').on('submit', async function (e) {
        e.preventDefault();

        const user = {
            google_id: $('#google_id').val().trim(),
            username: $('#username').val().trim(),
            firstname: $('#firstname').val().trim(),
        };

        try {
            const response = await fetch(
                SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/users',
                {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        Prefer: 'return=representation',
                    },
                    body: JSON.stringify(user),
                }
            );

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(errText || 'Supabase insert failed (' + response.status + ')');
            }

            const result = await response.json();
            alert('User registered successfully');
            console.log('Supabase result:', result);
        } catch (error) {
            console.error(error);
            alert('Registration failed');
        }
    });
});
