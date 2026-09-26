import NightIcon from '../../../components/NightIcon';
import {regionShowcasePhotos} from '../../landing/region-showcase-photos';
export default function NightCommunitySidebar({onRegion}:{onRegion:(name:string)=>void}) {
 return <aside className="night-community-sidebar">
 <section><h2><NightIcon name="map"/>여행 준비 가이드</h2><p>처음이신가요? 여행 전 꼭 확인해보세요.</p>{[['access','장애인 이용 시설 찾기','/planner'],['bus','교통편 이용 가이드','/guide#return-transport'],['bed','여행 준비 가이드','/guide#planner-guide'],['shield','여행 시 유용한 팁','/guide']].map(([icon,text,href])=><a key={text} className="night-guide-row" href={href}><NightIcon name={icon}/>{text}</a>)}</section>
 <section><h2><NightIcon name="calendar"/>지역별 이야기 찾기</h2>{['통영','거제','진주','김해','창원'].map(name=><button className="night-popular-region" key={name} type="button" onClick={()=>onRegion(name)}><img src={regionShowcasePhotos[name].image} alt="" width="46" height="34"/><strong>{name}시</strong><small>게시글 검색</small></button>)}</section></aside>;
}
