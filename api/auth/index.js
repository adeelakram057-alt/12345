// api/auth/index.js
// GitHub OAuth handler for Netlify CMS on Vercel
// Handles both the login redirect and the callback

const CLIENT_ID     = 'Ov23liGIKt5TbYmCWui5';
const CLIENT_SECRET = '74c520ed43b2f72b0f29928f8062202ffaa9507c';
const SITE_URL      = 'https://12345-teal-delta.vercel.app';

export default async function handler(req, res) {
  const { code, provider } = req.query;

  // ── Step 1: Redirect to GitHub login ──
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

  // ── Step 2: Exchange code for access token ──
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
          code: code
        })
      }
    );

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).send(`
        <html><body>
          <h3>OAuth Error: ${tokenData.error}</h3>
          <p>${tokenData.error_description}</p>
          <a href="${SITE_URL}/admin">Try again</a>
        </body></html>
      `);
    }

    const token = tokenData.access_token;

    // ── Step 3: Send token back to CMS via postMessage ──
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authenticating...</title></head>
      <body>
        <p style="font-family:sans-serif;text-align:center;margin-top:40px">
          ✅ Logging you in to ScholarPath Admin...
        </p>
        <script>
          // Send token to CMS
          const receiveMessage = (e) => {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({token: "TOKEN", provider: "github"}).replace("TOKEN", "' + token + '")}',
              e.origin
            );
          };
          window.addEventListener('message', receiveMessage, false);
          window.opener.postMessage('authorizing:github', '*');
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    return res.status(500).send(`
      <html><body>
        <h3>Server Error</h3>
        <p>${err.message}</p>
        <a href="${SITE_URL}/admin">Go back to admin</a>
      </body></html>
    `);
  }
}
