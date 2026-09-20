import Link from 'next/link';
import NightIcon from '../../../components/NightIcon';

const links = [
  ['edit','여행 설계','나만의 여행 플랜','/planner'],
  ['pin','여행지 탐색','경남의 새로운 풍경','/planner?region=경남%20전체'],
  ['calendar','축제','지금, 경남의 축제','/festivals'],
  ['chat','커뮤니티','여행을 이야기해요','/community'],
  ['map','여행 정보','교통·숙박·편의시설','/guide'],
];
export default function LandingFeatureLinks() {
  return <nav className="night-feature-links" aria-label="WAVE로 여행하기" data-land-reveal>{links.map(([icon,title,description,href])=><Link href={href} key={title}><span><NightIcon name={icon} size={27}/></span><strong>{title}</strong><small>{description}</small></Link>)}</nav>;
}
