const path = require('path');

// On Render, UPLOADS_PATH points to a folder on the persistent disk
// (see render.yaml) so uploaded images survive restarts and redeploys.
// On Vercel the deployment bundle is read-only outside of /tmp, so fall
// back to /tmp (note: /tmp is wiped between invocations there, so uploads
// don't persist across deploys/cold starts unless UPLOADS_PATH points at
// real persistent storage).
// Falls back to public/uploads for local development.
const UPLOADS_DIR = process.env.UPLOADS_PATH
  || (process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'public', 'uploads'));

module.exports = { UPLOADS_DIR };
