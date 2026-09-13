import { PHOTO_MAX_BYTES, PHOTO_MAX_SIDE, stripEncodedPhotoMetadata, validateAssistantPhoto, type AssistantPhoto } from '../../../lib/assistant-photo.js';

export async function prepareAssistantPhoto(file: File): Promise<AssistantPhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WebP 사진 한 장을 골라주세요.');
  if (file.size > 12 * 1024 * 1024) throw new Error('12MB 이하 사진을 골라주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode().catch(() => { throw new Error('사진을 열지 못했어요. 다른 사진을 골라주세요.'); });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('사진 해상도가 너무 커요. 필요한 부분만 잘라서 올려주세요.');
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 사진을 준비하지 못했어요.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = stripEncodedPhotoMetadata(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      if (data.length * 0.75 > PHOTO_MAX_BYTES) continue;
      const photo = validateAssistantPhoto({ mimeType: 'image/jpeg', data });
      if (photo) return photo;
    }
    throw new Error('사진 용량이 커요. 읽을 부분만 잘라서 다시 올려주세요.');
  } finally { URL.revokeObjectURL(url); }
}
