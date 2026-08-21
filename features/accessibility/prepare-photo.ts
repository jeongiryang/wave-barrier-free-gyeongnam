"use client";

/**
 * 업로드 전에 사진을 캔버스로 다시 그린다.
 *
 * 스마트폰 사진의 EXIF에는 촬영 위치(GPS)가 들어 있다. 파일을 그대로 서버로
 * 보내면 "사용자 GPS 좌표를 브라우저 밖으로 내보내지 않는다"는 저장소 규칙이
 * 깨진다. 캔버스로 재인코딩하면 픽셀만 남고 EXIF 전체가 사라지므로, 좌표가
 * 서버·DB·로그 어디에도 닿지 않는다. 크기 축소는 그 부수 효과다.
 */

const MAX_EDGE = 1600;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.82;

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 원본 파일 기준 상한. 재인코딩 뒤에는 이보다 훨씬 작아진다. */
export const MAX_PHOTO_BYTES = 12_000_000;

export type PreparedPhoto = { dataUrl: string; mimeType: string; width: number; height: number };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    image.src = url;
  });
}

function scaled(width: number, height: number) {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return { width, height };
  const ratio = MAX_EDGE / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function preparePhotoForScan(file: File): Promise<PreparedPhoto> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    throw new Error("JPEG, PNG, WebP 형식의 사진만 분석할 수 있습니다.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("사진 용량이 너무 큽니다. 더 작은 사진을 선택해 주세요.");
  }

  const image = await loadImage(file).catch(() => {
    throw new Error("사진을 읽지 못했습니다. 다른 사진으로 다시 시도해 주세요.");
  });

  const size = scaled(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이 브라우저에서는 사진을 준비하지 못했습니다.");
  context.drawImage(image, 0, 0, size.width, size.height);

  // toDataURL은 픽셀만 직렬화한다. 원본 EXIF는 여기서 완전히 사라진다.
  const dataUrl = canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY);
  return { dataUrl, mimeType: OUTPUT_TYPE, width: size.width, height: size.height };
}
