'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useStoryReactions } from '../hooks/useStoryReactions';
import NightIcon from '../../../components/NightIcon';
import SmartSpotImage from '../../tourism/components/SmartSpotImage';
import { regionShowcasePhotos } from '../../landing/region-showcase-photos';
import { usePlaceDialogFocus } from '../../planner/hooks/usePlaceDialogFocus';
import { mockupStories, type MockupStory } from '../mockup-stories';
function StoryPhoto({ story }: { story: MockupStory }) {
 const photo = regionShowcasePhotos[story.region];
 const curated:Record<string,{title:string;image:string}> = {
  'coast-diary':{title:'달아공원',image:'https://tong.visitkorea.or.kr/cms/resource/84/3072984_image2_1.jpg'},
  'geoje-parking':{title:'구조라해수욕장',image:'https://tong.visitkorea.or.kr/cms/resource/10/3519210_image2_1.jpg'},
  'sacheon-food':{title:'박서방식당',image:'https://tong.visitkorea.or.kr/cms/resource/83/3547883_image2_1.jpg'},
 };
 if(curated[story.id]) return <SmartSpotImage title={curated[story.id].title} src={curated[story.id].image} region={story.region} tag="관광" rank={0} showMeta={false}/>;
 const specific = ['gimhae-museum','jinju-walk'].includes(story.id);
 return <SmartSpotImage title={specific ? story.photoTitle : photo.title} region={story.region} tag="관광" src={specific ? undefined : photo.image} rank={0} showMeta={false}/>;
}
function StoryDialog({story,onClose}:{story:MockupStory;onClose:()=>void}) {
 const dialog=usePlaceDialogFocus(true,onClose);
 return <dialog ref={dialog} className="night-story-dialog" aria-labelledby="night-story-title"><button type="button" className="night-dialog-close" aria-label="게시글 닫기" onClick={onClose}>×</button><StoryPhoto story={story}/><div><small>{story.label} · {story.region}</small><h2 id="night-story-title" tabIndex={-1}>{story.title}</h2><p className="night-story-byline">{story.author} · {story.date}</p><p>{story.content}</p><p>여행을 준비할 때는 방문할 장소의 최신 운영시간과 편의 정보를 함께 확인해 주세요.</p><a className="night-primary" href={'/planner?region='+encodeURIComponent(story.region)}>{story.region} 여행 계획하기 <NightIcon name="arrow"/></a><footer><Link href="/community/new">내 여행 이야기 쓰기</Link><a href="/policies#content-credits">관광사진 출처</a></footer></div></dialog>;
}
export default function NightCommunityStories({category,query,sort,layout,featured,savedOnly=false}:{category:string;query:string;sort:string;layout:string;featured:boolean;savedOnly?:boolean}) {
 const [opened,setOpened]=useState<MockupStory|null>(null);
 const { liked, saved, toggle, ready } = useStoryReactions();
 const close=useCallback(()=>setOpened(null),[]);
 const stories=mockupStories.filter(item=>item.featured===featured&&(!savedOnly||saved.includes(item.id))&&(!category||item.category===category)&&(!query||[item.title,item.content,item.region,item.author].join(' ').includes(query))).sort((a,b)=>sort==='popular'?b.likes-a.likes:sort==='comments'?b.comments-a.comments:0);
 if(!stories.length)return null;
 return <><div className="night-story-grid" data-layout={layout}>{stories.map(story=><article className="night-story-card" key={story.id}>
 <div className="night-story-photo"><button className="night-photo-open" type="button" onClick={()=>setOpened(story)} aria-label={story.title+' 게시글 읽기'}><StoryPhoto story={story}/></button><span className="night-story-label" data-category={story.category}><NightIcon name="star" size={14}/>{story.label}</span><button type="button" className="night-bookmark" aria-label={story.title+' 저장'} disabled={!ready} aria-pressed={saved.includes(story.id)} onClick={()=>toggle('saved',story.id)}><NightIcon name="bookmark"/></button></div>
 <div className="night-story-body"><h3><button type="button" onClick={()=>setOpened(story)}>{story.title}</button></h3><p>{story.content}</p>{!featured&&<div className="night-tags">{story.tags.map(tag=><a key={tag} href={'/planner?region='+encodeURIComponent(story.region)}>#{tag}</a>)}</div>}<footer><span className="night-avatar"><NightIcon name="user" size={18}/></span><span className="night-author">{story.author}<small>{story.date}</small></span><button type="button" aria-label={story.title+' 좋아요'} disabled={!ready} aria-pressed={liked.includes(story.id)} onClick={()=>toggle('liked',story.id)}><NightIcon name="heart" size={17}/>{story.likes+Number(liked.includes(story.id))}</button><span className="night-comment-count" aria-label={'댓글 '+story.comments+'개'}><NightIcon name="chat" size={17}/>{story.comments}</span></footer></div>
 </article>)}</div>{opened&&<StoryDialog story={opened} onClose={close}/>}</>;
}
