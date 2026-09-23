const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UPLOADS_DIR } = require('./uploadsPath');

// On Vercel, product photos can't live on local disk (see uploadsPath.js) -
// store them in Vercel Blob instead when it's configured (BLOB_READ_WRITE_TOKEN
// is set automatically once a Blob store is linked to the project). Falls
// back to writing local files for local development.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// Phone camera uploads routinely land in the 2-8MB range at 3000px+ wide,
// which is far more than a product photo ever needs and makes shop/product
// pages painfully slow to load. Downscale and recompress everything to a
// size that still looks sharp at full-bleed on a product page. GIFs are
// left alone so animation isn't destroyed.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;

async function processImage(buffer, mimetype) {
  if (mimetype === 'image/gif') {
    return { buffer, contentType: 'image/gif', extension: '.gif' };
  }

  const optimized = await sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer: optimized, contentType: 'image/jpeg', extension: '.jpeg' };
}

function randomFilename(extension) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return uniqueSuffix + extension;
}

async function persistBuffer(buffer, contentType, extension) {
  const filename = randomFilename(extension);

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false
    });
    return blob.url;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return '/uploads/' + filename;
}

async function saveImage(file) {
  const { buffer, contentType, extension } = await processImage(file.buffer, file.mimetype);
  return persistBuffer(buffer, contentType, extension);
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

// One-time cleanup for images uploaded before saveImage() started resizing:
// re-fetches the current file, runs it through the same pipeline, stores the
// result under a new name, and removes the oversized original.
async function reoptimizeExistingImage(imagePath) {
  let sourceBuffer;
  if (/^https?:\/\//.test(imagePath)) {
    const response = await fetch(imagePath);
    if (!response.ok) {
      throw new Error('Failed to fetch existing image (' + response.status + '): ' + imagePath);
    }
    sourceBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    sourceBuffer = fs.readFileSync(path.join(UPLOADS_DIR, path.basename(imagePath)));
  }

  const metadata = await sharp(sourceBuffer).metadata();
  if (metadata.format === 'gif') {
    return imagePath;
  }

  const { buffer, contentType, extension } = await processImage(sourceBuffer, 'image/' + metadata.format);
  const newPath = await persistBuffer(buffer, contentType, extension);

  if (newPath !== imagePath) {
    await deleteImage(imagePath).catch(() => {});
  }
  return newPath;
}

module.exports = { saveImage, deleteImage, reoptimizeExistingImage };
