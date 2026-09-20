import NightIcon from '../../../components/NightIcon';
import {regionShowcasePhotos} from '../../landing/region-showcase-photos';
export default function NightCommunitySidebar({onRegion}:{onRegion:(name:string)=>void}) {
 return <aside className="night-community-sidebar">
 <section><h2><NightIcon name="chat"/>WAVE 커뮤니티 이용 안내</h2><ul>{['서로를 존중하는 따뜻한 언어를 사용해주세요.','정확한 정보와 경험을 바탕으로 작성해주세요.','광고, 불법 정보, 혐오 표현은 제외될 수 있습니다.','모두가 안전하고 행복한 여행 문화를 만들어요!'].map(text=><li key={text}><NightIcon name="check" size={15}/>{text}</li>)}</ul><a className="night-outline-link" href="/policies">커뮤니티 운영정책 보기 <NightIcon name="arrow" size={18}/></a></section>
 <section><h2><NightIcon name="map"/>여행 준비 가이드</h2><p>처음이신가요? 여행 전 꼭 확인해보세요.</p>{[['access','장애인 이용 시설 찾기','/planner'],['bus','교통편 이용 가이드','/guide#return-transport'],['bed','여행 준비 가이드','/guide#planner-guide'],['shield','여행 시 유용한 팁','/guide']].map(([icon,text,href])=><a key={text} className="night-guide-row" href={href}><NightIcon name={icon}/>{text}<span>›</span></a>)}</section>
 <section><h2><NightIcon name="calendar"/>인기 여행지 이야기</h2>{[['통영','342'],['거제','298'],['진주','276'],['김해','215'],['창원','198']].map(([name,count],index)=><button className="night-popular-region" key={name} type="button" onClick={()=>onRegion(name)}><i>{index+1}</i><img src={regionShowcasePhotos[name].image} alt="" width="46" height="34"/><strong>{name}시</strong><small>{count}개의 이야기</small></button>)}</section></aside>;
}
