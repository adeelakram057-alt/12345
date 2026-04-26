// api/auth/index.js
const CLIENT_ID     = 'Ov23liGIKt5TbYmCWui5';
const CLIENT_SECRET = '74c520ed43b2f72b0f29928f8062202ffaa9507c';
const SITE_URL      = 'https://12345-teal-delta.vercel.app';

export default async function handler(req, res) {
  const { code } = req.query;

  // ── Step 1: No code yet → redirect to GitHub login ──
  if (!code) {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'repo,user',
      redirect_uri: `${SITE_URL}/api/auth`
    });
    return res.redirect(
      `https://github.com/login/oauth/authorize?${params}`
    );
  }

  // ── Step 2: Exchange code for token ──
  try {
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code
        })
      }
    );

    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      return res.status(400).send(`
        <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2>❌ Login Error</h2>
          <p>${data.error_description || 'Could not get access token'}</p>
          <a href="${SITE_URL}/admin">← Try again</a>
        </body></html>
      `);
    }

    const token = data.access_token;

    // ── Step 3: Send token back to CMS via postMessage ──
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 60px; background: #EBF4FF; }
          .box { background: #fff; border-radius: 12px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
          h2 { color: #1A5C9A; }
          p { color: #5A7A9A; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>✅ Login Successful!</h2>
          <p>Redirecting you to the admin panel...</p>
          <p style="font-size:.8rem;margin-top:20px">If nothing happens, <a href="${SITE_URL}/admin">click here</a></p>
        </div>
        <script>
          (function() {
            // The message Netlify CMS expects to receive
            var message = 'authorization:github:success:' + JSON.stringify({
              token: '${token}',
              provider: 'github'
            });

            // Try to send to opener window (the admin panel)
            function sendToken() {
              if (window.opener) {
                window.opener.postMessage(message, '${SITE_URL}');
                setTimeout(function() { window.close(); }, 1000);
              } else {
                // No opener — store token and redirect
                localStorage.setItem('netlify-cms-github-token', '${token}');
                window.location.href = '${SITE_URL}/admin';
              }
            }

            // Listen for CMS ready signal then send token
            window.addEventListener('message', function(e) {
              if (e.data === 'authorizing:github') {
                sendToken();
              }
            });

            // Also try sending immediately
            setTimeout(sendToken, 500);
          })();
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    return res.status(500).send(`
      <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>❌ Server Error</h2>
        <p>${err.message}</p>
        <a href="${SITE_URL}/admin">← Go back</a>
      </body></html>
    `);
  }
}
