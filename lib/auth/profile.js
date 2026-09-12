export function profileName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{N} ._-]{2,20}$/u.test(name) ? name : null;
}
export function profileUpdateBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'name')) return null;
  const name = profileName(value.name);
  return name ? { name } : null;
}
