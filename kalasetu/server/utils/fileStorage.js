const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_ROOT, 'originals');
const STUDIO_DIR = path.join(UPLOADS_ROOT, 'studio');

[UPLOADS_ROOT, ORIGINALS_DIR, STUDIO_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Persists a buffer to disk under the given subfolder and returns the
 * public-relative URL path (to be prefixed with the server's base URL).
 * @param {Buffer} buffer
 * @param {'originals'|'studio'} kind
 * @param {string} extension - e.g. 'jpg', 'png'
 */
function saveImageBuffer(buffer, kind, extension = 'png') {
  const dir = kind === 'originals' ? ORIGINALS_DIR : STUDIO_DIR;
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${kind}/${filename}`;
}

function extensionFromMimetype(mimetype) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimetype] || 'jpg';
}

module.exports = { saveImageBuffer, extensionFromMimetype, UPLOADS_ROOT };
