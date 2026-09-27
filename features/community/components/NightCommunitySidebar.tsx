import { useId } from 'react';
import NightIcon from '../../../components/NightIcon';
export default function NightCommunitySidebar({onRegion,ready}:{onRegion:(name:string)=>void;ready:boolean}) {
 const id = useId();
 return <div className="community-help-tools">
 <button type="button" data-icon-action="" popoverTarget={`${id}-regions`} aria-label="지역별 이야기 찾기" title="지역별 이야기 찾기"><NightIcon name="pin" size={20}/></button>
 <button type="button" data-icon-action="" popoverTarget={`${id}-help`} aria-label="여행 준비 도움말" title="여행 준비 도움말"><NightIcon name="info" size={20}/></button>
 <div id={`${id}-help`} popover="auto" className="community-tools-popover"><header><h2>여행 준비 가이드</h2><button type="button" data-icon-action="" popoverTarget={`${id}-help`} popoverTargetAction="hide" aria-label="여행 준비 도움말 닫기"><NightIcon name="close"/></button></header><p>여행 전 필요한 내용을 확인하세요.</p>{[['access','장애인 이용 시설 찾기','/planner'],['bus','교통편 이용 가이드','/guide#return-transport'],['bed','여행 준비 가이드','/guide#planner-guide'],['shield','여행 시 유용한 팁','/guide']].map(([icon,text,href])=><a key={text} className="night-guide-row" href={href}><NightIcon name={icon}/>{text}</a>)}</div>
 <div id={`${id}-regions`} popover="auto" className="community-tools-popover"><header><h2>지역별 이야기 찾기</h2><button type="button" data-icon-action="" popoverTarget={`${id}-regions`} popoverTargetAction="hide" aria-label="지역별 이야기 닫기"><NightIcon name="close"/></button></header><div className="community-region-shortcuts">{['통영','거제','진주','김해','창원'].map(name=><button key={name} type="button" disabled={!ready} onClick={()=>onRegion(name)} popoverTarget={`${id}-regions`} popoverTargetAction="hide">{name}</button>)}</div></div>
 </div>;
}
