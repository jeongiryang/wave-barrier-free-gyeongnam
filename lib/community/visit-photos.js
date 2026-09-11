export const MAX_VISIT_PHOTOS = 2;
export const MAX_VISIT_PHOTO_BYTES = 120 * 1024;
export const MAX_VISIT_PHOTO_SIDE = 800;
const prefix = 'data:image/jpeg;base64,';
const failure = () => new Error('사진을 다시 선택해 주세요. 800px 이하의 JPEG 사진만 사용할 수 있습니다.');

/** Validate the bounded baseline JPEG container and discard APP/COM metadata independently of the client. */
export function stripVisitPhotoMetadata(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) throw failure();
  const encoded = dataUrl.slice(prefix.length);
  if (!encoded || encoded.length > Math.ceil(MAX_VISIT_PHOTO_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw failure();
  const binary = atob(encoded), bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (bytes.length > MAX_VISIT_PHOTO_BYTES || bytes[0] !== 255 || bytes[1] !== 216) throw failure();
  const segments = [bytes.subarray(0, 2)];
  let position = 2, width = 0, height = 0, components = 0, quantization = false, huffman = false;
  while (position + 4 <= bytes.length) {
    const start = position;
    if (bytes[position++] !== 255) throw failure();
    while (bytes[position] === 255) position++;
    const marker = bytes[position++], size = bytes[position] * 256 + bytes[position + 1];
    if (size < 2 || position + size > bytes.length) throw failure();
    const end = position + size;
    if ((marker >= 224 && marker <= 239) || marker === 254) { position = end; continue; }
    if (![192, 196, 219, 221, 218].includes(marker)) throw failure();
    if (marker === 192) {
      if (components || bytes[position + 2] !== 8) throw failure();
      height = bytes[position + 3] * 256 + bytes[position + 4]; width = bytes[position + 5] * 256 + bytes[position + 6]; components = bytes[position + 7];
      if (![1, 3].includes(components) || size !== 8 + components * 3 || width < 1 || height < 1 || width > MAX_VISIT_PHOTO_SIDE || height > MAX_VISIT_PHOTO_SIDE) throw failure();
    }
    if (marker === 219) quantization = true;
    if (marker === 196) huffman = true;
    if (marker === 221 && size !== 4) throw failure();
    segments.push(bytes.subarray(start, end));
    if (marker === 218) {
      if (!components || !quantization || !huffman || bytes[position + 2] !== components || size !== 6 + components * 2 || bytes[end - 3] !== 0 || bytes[end - 2] !== 63 || bytes[end - 1] !== 0) throw failure();
      for (let cursor = end; cursor + 1 < bytes.length; cursor++) {
        if (bytes[cursor] !== 255) continue;
        let next = cursor + 1;
        while (bytes[next] === 255) next++;
        const code = bytes[next];
        if (code === 0 || (code >= 208 && code <= 215)) { cursor = next; continue; }
        if (code !== 217 || next + 1 !== bytes.length || cursor === end) throw failure();
        segments.push(bytes.subarray(end));
        let safe = '';
        for (const segment of segments) for (const byte of segment) safe += String.fromCharCode(byte);
        return { dataUrl: prefix + btoa(safe), width, height };
      }
      throw failure();
    }
    position = end;
  }
  throw failure();
}

export function normalizeVisitPhotos(value) {
  if (value == null) return { photos: [] };
  if (!Array.isArray(value) || value.length > MAX_VISIT_PHOTOS) return { error: '현장 사진은 최대 2장까지 첨부할 수 있습니다.' };
  const photos = [];
  try {
    for (const item of value) {
      const photo = stripVisitPhotoMetadata(item?.dataUrl);
      const caption = typeof item?.caption === 'string' ? item.caption.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160) : '';
      if (!caption) return { error: '사진에서 확인할 수 있는 편의시설이나 이동 동선을 설명해 주세요.' };
      photos.push({ ...photo, caption });
    }
    return { photos };
  } catch (error) { return { error: error instanceof Error ? error.message : '사진을 다시 선택해 주세요.' }; }
}
