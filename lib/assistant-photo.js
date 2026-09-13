export const PHOTO_MAX_BYTES = 800000;
export const PHOTO_MAX_SIDE = 1600;

// Canvas may add an ICC APP2 segment. Remove application metadata from its
// freshly encoded output before the strict server admission check.
export function stripEncodedPhotoMetadata(data) {
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  const chunks = [bytes.slice(0, 2)];
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 255) throw new Error('invalid JPEG');
    const marker = bytes[offset + 1];
    if (marker === 218) { chunks.push(bytes.slice(offset)); break; }
    const length = bytes[offset + 2] * 256 + bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) throw new Error('invalid JPEG');
    if (marker !== 254 && !(marker >= 225 && marker <= 239)) chunks.push(bytes.slice(offset, offset + length + 2));
    offset += length + 2;
  }
  return btoa(chunks.map(chunk => Array.from(chunk, byte => String.fromCharCode(byte)).join('')).join(''));
}

// Only freshly encoded JPEGs are accepted. Reject EXIF, comments and other
// application metadata, including GPS, even if the browser client is bypassed.
export function validateAssistantPhoto(value) {
  if (!value || value.mimeType !== 'image/jpeg' || typeof value.data !== 'string' || value.data.length > Math.ceil(PHOTO_MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data) || value.data.length % 4) return null;
  let bytes;
  try { bytes = Uint8Array.from(atob(value.data), char => char.charCodeAt(0)); } catch { return null; }
  if (bytes.length > PHOTO_MAX_BYTES || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return null;
  let offset = 2, dimensions = false, scanned = false;
  while (offset + 1 < bytes.length) {
    if (bytes[offset++] !== 255) return null;
    const marker = bytes[offset++];
    if (marker === 217) return dimensions && scanned && offset === bytes.length ? { mimeType: 'image/jpeg', data: value.data } : null;
    if (marker === 254 || marker >= 225 && marker <= 239) return null;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if ([192, 193, 194].includes(marker)) {
      if (length < 8) return null;
      const height = bytes[offset + 3] * 256 + bytes[offset + 4], width = bytes[offset + 5] * 256 + bytes[offset + 6];
      if (!width || !height || width > PHOTO_MAX_SIDE || height > PHOTO_MAX_SIDE) return null;
      dimensions = true;
    }
    offset += length;
    if (marker === 218) {
      if (!dimensions) return null;
      scanned = true;
      // Entropy data may escape FF as FF00 or contain restart markers.
      // Resume segment validation after each scan, including progressive JPEGs.
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 255) { offset++; continue; }
        const next = bytes[offset + 1];
        if (next === 0 || next >= 208 && next <= 215) { offset += 2; continue; }
        if (next === 255) { offset++; continue; }
        break;
      }
    }
  }
  return null;
}
