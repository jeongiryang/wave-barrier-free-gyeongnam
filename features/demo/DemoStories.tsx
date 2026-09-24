import { demoStories } from './stories';
import './demo.css';
export default function DemoStories() {
  return <section id="demo-community" className="demo-stories" aria-labelledby="demo-stories-title"><h2 id="demo-stories-title">시연용 커뮤니티</h2><div className="demo-grid">{demoStories.map(story => <article key={story.title}><img src={story.image} alt={story.alt} loading="lazy" width="768" height="512" /><div><small>{story.category}</small><h3>[시연] {story.title}</h3><p>{story.body}</p><small>이미지: AI 생성 · 실제 장소 사진 아님</small></div></article>)}</div></section>;
}
