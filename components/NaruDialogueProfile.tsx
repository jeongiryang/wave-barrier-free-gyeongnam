export default function NaruDialogueProfile({ speaker }: { speaker: 'child' | 'naru' }) {
  return <span className="naru-dialogue-profile" data-speaker={speaker}><span className="naru-dialogue-portrait" aria-hidden="true" /><span className="naru-dialogue-name">{speaker === 'child' ? '꼬마 여행자' : '나루'}</span></span>;
}
