/**
 * 테스트용 최소 JPEG를 만든다. 실제 사진 파일을 저장소에 넣지 않고도 EXIF
 * 판독기를 바이트 단위로 검증하기 위한 도구다.
 */
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

function rationalBytes(values, little) {
  const buffer = new ArrayBuffer(values.length * 8);
  const view = new DataView(buffer);
  values.forEach(([numerator, denominator], index) => {
    view.setUint32(index * 8, numerator, little);
    view.setUint32((index * 8) + 4, denominator, little);
  });
  return new Uint8Array(buffer);
}

function asciiBytes(text) {
  const bytes = new Uint8Array(text.length + 1);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

/**
 * entries: [{ tag, type, count, inline?: number, bytes?: Uint8Array }]
 * 반환: { size, write(view, tiffStart, ifdStart, heapStart) -> 다음 heap 위치 }
 */
function ifdWriter(entries, little) {
  return {
    size: 2 + (entries.length * 12) + 4,
    write(view, bytesOut, tiffStart, ifdStart, heapStart) {
      view.setUint16(ifdStart, entries.length, little);
      let heap = heapStart;
      entries.forEach((entry, index) => {
        const at = ifdStart + 2 + (index * 12);
        view.setUint16(at, entry.tag, little);
        view.setUint16(at + 2, entry.type, little);
        view.setUint32(at + 4, entry.count, little);
        if (entry.bytes && entry.bytes.length > 4) {
          view.setUint32(at + 8, heap - tiffStart, little);
          bytesOut.set(entry.bytes, heap);
          heap += entry.bytes.length + (entry.bytes.length % 2);
        } else if (entry.bytes) {
          bytesOut.set(entry.bytes, at + 8);
        } else {
          view.setUint32(at + 8, entry.inline || 0, little);
        }
      });
      view.setUint32(ifdStart + 2 + (entries.length * 12), 0, little);
      return heap;
    },
  };
}

export function buildExifJpeg({ takenAt = "", lat = null, lng = null, little = true } = {}) {
  const exifEntries = [];
  if (takenAt) exifEntries.push({ tag: 0x9003, type: TYPE_ASCII, count: takenAt.length + 1, bytes: asciiBytes(takenAt) });

  const gpsEntries = [];
  if (lat !== null && lng !== null) {
    const toParts = (value) => {
      const absolute = Math.abs(value);
      const degrees = Math.floor(absolute);
      const minutes = Math.floor((absolute - degrees) * 60);
      const seconds = Math.round((absolute - degrees - (minutes / 60)) * 3600 * 1000);
      return [[degrees, 1], [minutes, 1], [seconds, 1000]];
    };
    gpsEntries.push({ tag: 0x0001, type: TYPE_ASCII, count: 2, bytes: asciiBytes(lat >= 0 ? "N" : "S") });
    gpsEntries.push({ tag: 0x0002, type: TYPE_RATIONAL, count: 3, bytes: rationalBytes(toParts(lat), little) });
    gpsEntries.push({ tag: 0x0003, type: TYPE_ASCII, count: 2, bytes: asciiBytes(lng >= 0 ? "E" : "W") });
    gpsEntries.push({ tag: 0x0004, type: TYPE_RATIONAL, count: 3, bytes: rationalBytes(toParts(lng), little) });
  }

  const zerothEntries = [];
  if (exifEntries.length) zerothEntries.push({ tag: 0x8769, type: TYPE_LONG, count: 1, inline: 0 });
  if (gpsEntries.length) zerothEntries.push({ tag: 0x8825, type: TYPE_LONG, count: 1, inline: 0 });

  const zeroth = ifdWriter(zerothEntries, little);
  const exif = ifdWriter(exifEntries, little);
  const gps = ifdWriter(gpsEntries, little);

  const tiffSize = 8 + zeroth.size + exif.size + gps.size + 512;
  const total = 2 + 4 + 6 + tiffSize;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);

  view.setUint16(0, 0xffd8);
  view.setUint16(2, 0xffe1);
  view.setUint16(4, 2 + 6 + tiffSize);
  bytes.set(asciiBytes("Exif").subarray(0, 4), 6);
  bytes[10] = 0;
  bytes[11] = 0;

  const tiff = 12;
  view.setUint16(tiff, little ? 0x4949 : 0x4d4d);
  view.setUint16(tiff + 2, 0x002a, little);
  view.setUint32(tiff + 4, 8, little);

  const zerothStart = tiff + 8;
  const exifStart = zerothStart + zeroth.size;
  const gpsStart = exifStart + exif.size;
  let heap = gpsStart + gps.size;

  let pointerIndex = 0;
  if (exifEntries.length) {
    zerothEntries[pointerIndex].inline = exifStart - tiff;
    pointerIndex += 1;
  }
  if (gpsEntries.length) zerothEntries[pointerIndex].inline = gpsStart - tiff;

  heap = zeroth.write(view, bytes, tiff, zerothStart, heap);
  heap = exif.write(view, bytes, tiff, exifStart, heap);
  gps.write(view, bytes, tiff, gpsStart, heap);

  return bytes.buffer;
}
