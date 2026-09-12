/** Published room/building descriptions, never a venue name or content category alone. */
export function indoorEvidence(overview) {
  const text = typeof overview === 'string' ? overview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000) : '';
  const sentences = text.split(/(?<=[.!?다])\s+|[\n\r]/).filter(sentence => /실내/.test(sentence));
  const positive = sentences.find(sentence => /실내\s*(?:전시|체험|공연|관람|휴게|놀이|공간|시설|수영|정원|온실)/.test(sentence)
    && !/(없|않|아니|불가|금지|폐쇄|중단|철거|예정|계획|야외|실외|예약한.*경우|우천.*시)/.test(sentence));
  // A source can describe an actual exhibition room, screening room or building
  // interior without using the adjective 'indoor'. Retain that exact evidence.
  const enclosed = text.split(/(?<=[.!?])\s+|[\n\r]/).find(sentence =>
    /(?:전시실|상영관|특수영상관|터널\s*내부|본관.{0,50}전시관|지하\s*\d층.{0,60}전시)/.test(sentence)
    && /있|갖추|갖춘|구성|운영|관람|볼 수|조성|유지/.test(sentence)
    && !/(없|않|불가|금지|폐쇄|중단|철거|예정|계획|야외\s*전시실|실외\s*전시실)/.test(sentence));
  const evidence = positive || enclosed;
  return evidence ? { state: 'indoor-space', detail: evidence.slice(0, 400) } : { state: 'unknown', detail: '' };
}
