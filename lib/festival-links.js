/** Only links actually supplied by the tourism record; never guess an organiser's domain. */
export function festivalWebsite(value) {
  if (typeof value !== 'string' || value.length > 6000) return '';
  const source = value.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || value.trim();
  try {
    const url = new URL(source.replaceAll('&amp;', '&'));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}
export function festivalSources(item) {
  const cotId = typeof item?.cotid === 'string' ? item.cotid.trim() : '';
  return { websiteUrl: festivalWebsite(item?.homepage), officialUrl: cotId && cotId.length < 100 ? `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${encodeURIComponent(cotId)}` : '' };
}
