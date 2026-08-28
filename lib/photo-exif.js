/** JPEG·PNG·WebP·TIFF의 EXIF에서 촬영 시각과 좌표만 읽는다. 사진은 브라우저 밖으로 보내지 않는다. */
const SOI = 0xffd8;
const APP1 = 0xffe1;
const SOS = 0xffda;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LNG_REF = 0x0003;
const TAG_GPS_LNG = 0x0004;
const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(view, start, length) {
  if (start < 0 || start + length > view.byteLength) return "";
  let value = "";
  for (let index = 0; index < length; index += 1) value += String.fromCharCode(view.getUint8(start + index));
  return value;
}

function findJpegExifStart(view) {
  if (view.byteLength < 4 || view.getUint16(0) !== SOI) return -1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00 || marker === SOS) return -1;
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) return -1;
    if (marker === APP1 && offset + 10 <= view.byteLength && ascii(view, offset + 4, 4) === "Exif") return offset + 10;
    offset += 2 + length;
  }
  return -1;
}

function findPngExifStart(view) {
  if (view.byteLength < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => view.getUint8(index) === value)) return -1;
  let offset = 8;
  while (offset + 12 <= view.byteLength) {
    const length = view.getUint32(offset);
    const type = ascii(view, offset + 4, 4);
    const dataStart = offset + 8;
    if (length > view.byteLength || dataStart + length + 4 > view.byteLength) return -1;
    if (type === "eXIf") return dataStart;
    offset = dataStart + length + 4;
    if (type === "IEND") break;
  }
  return -1;
}

function findWebpExifStart(view) {
  if (view.byteLength < 12 || ascii(view, 0, 4) !== "RIFF" || ascii(view, 8, 4) !== "WEBP") return -1;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const type = ascii(view, offset, 4);
    const length = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    if (length > view.byteLength || dataStart + length > view.byteLength) return -1;
    if (type === "EXIF") return ascii(view, dataStart, 4) === "Exif" ? dataStart + 6 : dataStart;
    offset = dataStart + length + (length % 2);
  }
  return -1;
}

function isTiffHeader(view, start) {
  if (start < 0 || start + 8 > view.byteLength) return false;
  const order = view.getUint16(start);
  if (order !== 0x4949 && order !== 0x4d4d) return false;
  return view.getUint16(start + 2, order === 0x4949) === 0x002a;
}

function findTiffStart(view) {
  const candidates = [findJpegExifStart(view), findPngExifStart(view), findWebpExifStart(view), 0];
  return candidates.find((start) => isTiffHeader(view, start)) ?? -1;
}

function readValue(view, tiff, entry, little) {
  const type = view.getUint16(entry + 2, little);
  const count = view.getUint32(entry + 4, little);
  const size = TYPE_SIZES[type];
  if (!size || count <= 0 || count > 4096) return null;
  const total = size * count;
  const start = total > 4 ? tiff + view.getUint32(entry + 8, little) : entry + 8;
  if (start < 0 || start + total > view.byteLength) return null;
  if (type === 2) {
    let text = "";
    for (let index = 0; index < count; index += 1) {
      const code = view.getUint8(start + index);
      if (!code) break;
      text += String.fromCharCode(code);
    }
    return text;
  }
  const numbers = [];
  for (let index = 0; index < count; index += 1) {
    const at = start + (index * size);
    if (type === 3) numbers.push(view.getUint16(at, little));
    else if (type === 4 || type === 9) numbers.push(view.getUint32(at, little));
    else if (type === 5 || type === 10) {
      const denominator = view.getUint32(at + 4, little);
      numbers.push(denominator ? view.getUint32(at, little) / denominator : 0);
    } else numbers.push(view.getUint8(at));
  }
  return numbers;
}

function readIfd(view, tiff, ifd, little, wanted) {
  const found = {};
  if (ifd + 2 > view.byteLength) return found;
  const count = view.getUint16(ifd, little);
  if (count > 512) return found;
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + (index * 12);
    if (entry + 12 > view.byteLength) break;
    const tag = view.getUint16(entry, little);
    if (!wanted.includes(tag)) continue;
    const value = readValue(view, tiff, entry, little);
    if (value !== null) found[tag] = value;
  }
  return found;
}

export function parseExifTimestamp(raw) {
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(raw || "").trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null;
  if (hourNumber > 23 || minuteNumber > 59) return null;
  return { date: `${year}-${month}-${day}`, minutes: (hourNumber * 60) + minuteNumber };
}

function degreesFrom(parts, ref) {
  if (!Array.isArray(parts) || parts.length < 3) return null;
  const [degrees, minutes, seconds] = parts.map(Number);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  const value = degrees + (minutes / 60) + (seconds / 3600);
  if (!Number.isFinite(value) || value > 180) return null;
  return value * (/^[SW]/i.test(String(ref || "")) ? -1 : 1);
}

export function readPhotoExif(buffer) {
  const empty = { takenAt: null, point: null };
  let view;
  try { view = new DataView(buffer); } catch { return empty; }
  const tiff = findTiffStart(view);
  if (tiff < 0 || tiff + 8 > view.byteLength) return empty;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return empty;
  const little = order === 0x4949;
  if (view.getUint16(tiff + 2, little) !== 0x002a) return empty;
  const zeroth = tiff + view.getUint32(tiff + 4, little);
  const pointers = readIfd(view, tiff, zeroth, little, [TAG_EXIF_IFD, TAG_GPS_IFD]);

  let takenAt = null;
  const exifOffset = pointers[TAG_EXIF_IFD]?.[0];
  if (Number.isFinite(exifOffset)) {
    const exif = readIfd(view, tiff, tiff + exifOffset, little, [TAG_DATE_TIME_ORIGINAL, TAG_DATE_TIME_DIGITIZED]);
    takenAt = parseExifTimestamp(exif[TAG_DATE_TIME_ORIGINAL] ?? exif[TAG_DATE_TIME_DIGITIZED]);
  }

  let point = null;
  const gpsOffset = pointers[TAG_GPS_IFD]?.[0];
  if (Number.isFinite(gpsOffset)) {
    const gps = readIfd(view, tiff, tiff + gpsOffset, little, [TAG_GPS_LAT_REF, TAG_GPS_LAT, TAG_GPS_LNG_REF, TAG_GPS_LNG]);
    const lat = degreesFrom(gps[TAG_GPS_LAT], gps[TAG_GPS_LAT_REF]);
    const lng = degreesFrom(gps[TAG_GPS_LNG], gps[TAG_GPS_LNG_REF]);
    if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) point = { lat, lng };
  }
  return { takenAt, point };
}
