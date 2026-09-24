"use client";
import { useState, useSyncExternalStore } from "react";
import CommunityHeader from "../../../components/CommunityHeader";
import SiteFooter from "../../../components/SiteFooter";
import SkipLink from "../../../components/SkipLink";
import NightBanner from "../../../components/NightBanner";
import NightIcon from "../../../components/NightIcon";
import {useCommunityBoard,type PlaceFilter} from "../hooks/useCommunityBoard";
import CommunityPostList from "./CommunityPostList";
import CommunityTravelStories from "./CommunityTravelStories";
import NightCommunitySidebar from "./NightCommunitySidebar";
import CommunitySavedPosts from './CommunitySavedPosts';
import type {CommunityLayout} from "../view-layout";
const subscribe = () => () => {};
export default function CommunityPage({initialPlace=null,fieldReportsEnabled=false}:{initialPlace?:PlaceFilter|null;fieldReportsEnabled?:boolean}) {

 const [layout,setLayout]=useState<CommunityLayout>('cards');
 const [sort,setSort]=useState('latest');
 const [savedOpen,setSavedOpen]=useState(false);
 const board=useCommunityBoard(initialPlace,sort);
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const category=board.category;
 return <main className="community-page wave-night"><SkipLink href="#community-list">게시글 목록으로 바로가기</SkipLink><CommunityHeader/><NightBanner kind="community"/>
 <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
 <h2 id="community-list-title" className="sr-only">여행 후기와 질문</h2>
 <div className="night-community-toolbar" aria-busy={!ready}><div className="night-category-tabs" tabIndex={0} role="group" aria-label="게시판 선택">{[['','전체'],['general','여행 질문'],['place','관광지 이야기'],['review','여행 후기'],['tips','여행 꿀팁'],['together','함께 여행해요'],['travel-talk','여행 이야기와 질문'],...(fieldReportsEnabled?[['field-report','현장 정보']]:[])].map(([key,label])=><button key={key} type="button" disabled={!ready} aria-pressed={category===key} onClick={()=>board.setCategory(key)}>{label}</button>)}</div>
 <form role="search" onSubmit={event=>{if(!ready){event.preventDefault();return;}board.submitSearch(event);}}><NightIcon name="search"/><label className="sr-only" htmlFor="community-search">여행 후기 검색</label><input disabled={!ready} id="community-search" value={board.search} onChange={e=>board.setSearch(e.target.value)} placeholder="궁금한 내용을 검색해보세요." maxLength={80}/><button disabled={!ready} aria-label="검색" type="submit">검색</button></form><a className="night-primary" href={board.writeHref}><NightIcon name="edit"/>글 쓰기</a></div>
 {board.placeFilter&&<div className="community-place-filter" role="complementary" aria-label="관광지 필터"><b>{board.placeFilter.name}</b><button type="button" disabled={!ready} onClick={()=>board.setPlaceFilter(null)}>전체 후기 보기</button><p>여행자 후기는 작성자 한 명의 경험입니다. 방문 시점과 이동 조건을 함께 확인해 주세요.</p></div>}
 {fieldReportsEnabled&&category==='field-report'&&<p className="community-field-report-notice">여행자가 직접 확인한 경험입니다. 방문 날짜와 이용 조건을 함께 확인해 주세요.</p>}{fieldReportsEnabled&&board.placeFilter&&<a href={board.fieldReportWriteHref}>이 관광지에서 확인한 정보 남기기</a>}<div className="night-community-columns"><div>
 <div className="night-sortbar" id="night-all-stories" aria-busy={!ready}><div role="group" aria-label="게시글 정렬">{[['latest','최신순'],['popular','인기순'],['comments','댓글순']].map(([key,label])=><button key={key} type="button" disabled={!ready} aria-pressed={sort===key} onClick={()=>setSort(key)}>{label}</button>)}</div><div role="group" aria-label="게시글 보기 방식"><button type="button" disabled={!ready} aria-pressed={layout==='cards'} onClick={()=>setLayout('cards')}><NightIcon name="grid" size={17}/>카드형</button><button type="button" disabled={!ready} aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><NightIcon name="list" size={17}/>목록형</button></div></div>
 <div className="night-sortbar"><button type="button" disabled={!ready} aria-expanded={savedOpen} aria-controls="community-saved-posts" onClick={()=>setSavedOpen(value=>!value)}>저장한 글</button></div>
 {savedOpen&&<div id="community-saved-posts"><CommunitySavedPosts/></div>}
 <CommunityPostList board={board} layout={layout}/>
 </div><NightCommunitySidebar onRegion={name=>{board.setPlaceFilter(null);board.setCategory('');board.setSearch(name);board.setQuery(name);}}/></div>
 <details className="community-guides"><summary>여행 준비 가이드</summary><CommunityTravelStories layout={layout}/></details></section><SiteFooter/></main>;
}
