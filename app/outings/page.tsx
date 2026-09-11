import Link from 'next/link';
import CommunityHeader from '../../components/CommunityHeader';
import SkipLink from '../../components/SkipLink';
import GithubFooterLink from '../../components/GithubFooterLink';
import OutingBuilder from '../../features/planner/components/OutingBuilder';
import {pageMetadata} from '../../lib/site-metadata';
export const metadata=pageMetadata({title:'짧은 나들이',description:'필요한 편의와 여유 시간을 고르고 경남의 한두 곳을 나만의 짧은 일정으로 저장하세요.',path:'/outings'});
export default function Page(){return <><SkipLink href="#main-content">짧은 나들이로 바로가기</SkipLink><CommunityHeader current="planner"/><main id="main-content" style={{maxWidth:1280,margin:'0 auto',padding:'180px clamp(16px,4vw,40px) 72px'}}><div style={{marginBottom:32}}><p style={{color:'var(--accent)',fontSize:14}}>WAVE · 짧은 나들이</p><h1 style={{fontSize:'clamp(32px,5vw,52px)',letterSpacing:'-0.045em',margin:'12px 0'}}>잠깐의 여유도, 나의 여행으로.</h1><p style={{fontSize:17,lineHeight:1.8,color:'var(--muted)'}}>긴 준비 없이 한두 곳부터. 오늘의 편의와 시간에 맞춰 골라보세요.</p></div><OutingBuilder/></main><footer className="travel-book-footer"><Link href="/planner">여행 계획</Link><Link href="/travel-book">저장한 일정</Link><Link href="/guide#small-trips">사용 방법</Link><Link href="/privacy">개인정보</Link><GithubFooterLink/></footer></>;}
