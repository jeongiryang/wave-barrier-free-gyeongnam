/** Only explicit provider wording about an indoor space. Never infer from category/name. */
export function indoorEvidence(overview) {
  const text = typeof overview === 'string' ? overview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000) : '';
  const sentences = text.split(/(?<=[.!?다])\s+|[\n\r]/).filter(sentence => /실내/.test(sentence));
  const positive = sentences.find(sentence => /실내\s*(?:전시|체험|공연|관람|휴게|놀이|공간|시설|수영|정원|온실)/.test(sentence)
    && !/(없|않|아니|불가|금지|폐쇄|중단|철거|예정|계획|야외|실외|예약한.*경우|우천.*시)/.test(sentence));
  return positive ? { state: 'indoor-space', detail: positive.slice(0, 400) } : { state: 'unknown', detail: '' };
}
