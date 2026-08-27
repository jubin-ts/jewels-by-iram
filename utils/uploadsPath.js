const path = require('path');

// On Render, UPLOADS_PATH points to a folder on the persistent disk
// (see render.yaml) so uploaded images survive restarts and redeploys.
// Falls back to public/uploads for local development.
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(__dirname, '..', 'public', 'uploads');

module.exports = { UPLOADS_DIR };
