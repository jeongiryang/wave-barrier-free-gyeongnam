import { readPhotoExif } from "./photo-exif.js";

export const MAX_PHOTOS = 200;
export const EXIF_HEAD_BYTES = 256 * 1024;

/**
 * 사진 전체가 아니라 EXIF가 있는 앞부분만, 한 장씩 순차적으로 읽는다.
 * 파일 객체의 실제 크기와 무관하게 한 번에 읽는 바이트 수를 EXIF_HEAD_BYTES로 제한한다.
 */
export async function readPhotoMetadataFiles(fileList, { onProgress } = {}) {
  const files = Array.from(fileList || []).slice(0, MAX_PHOTOS);
  const photos = [];
  let unreadable = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      const head = await file.slice(0, EXIF_HEAD_BYTES).arrayBuffer();
      const { takenAt, point } = readPhotoExif(head);
      photos.push({ name: String(file.name || ""), takenAt, point });
    } catch {
      unreadable += 1;
    }
    onProgress?.(index + 1, files.length);
  }

  return { photos, unreadable, selectedCount: files.length, truncated: Math.max(0, Array.from(fileList || []).length - files.length) };
}