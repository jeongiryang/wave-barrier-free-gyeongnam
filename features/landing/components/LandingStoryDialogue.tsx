export default function LandingStoryDialogue({ speaker = 'child', children }: { speaker?: 'child' | 'naru'; children: React.ReactNode }) {
 return <div className="story-dialogue" data-speaker={speaker}><i className="story-dialogue-portrait" aria-hidden="true"/><span><b>{speaker === 'child' ? '꼬마여행자' : '나루'}</b><span>{children}</span></span></div>;
}
