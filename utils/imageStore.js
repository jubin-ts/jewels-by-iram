const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR } = require('./uploadsPath');

// On Vercel, product photos can't live on local disk (see uploadsPath.js) -
// store them in Vercel Blob instead when it's configured (BLOB_READ_WRITE_TOKEN
// is set automatically once a Blob store is linked to the project). Falls
// back to writing local files for local development.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function randomFilename(originalname) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return uniqueSuffix + path.extname(originalname);
}

async function saveImage(file) {
  const filename = randomFilename(file.originalname);

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      addRandomSuffix: false
    });
    return blob.url;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return '/uploads/' + filename;
}

async function deleteImage(imagePath) {
  if (/^https?:\/\//.test(imagePath)) {
    if (useBlob) {
      const { del } = require('@vercel/blob');
      await del(imagePath).catch(() => {});
    }
    return;
  }

  const filePath = path.join(UPLOADS_DIR, path.basename(imagePath));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { saveImage, deleteImage };
