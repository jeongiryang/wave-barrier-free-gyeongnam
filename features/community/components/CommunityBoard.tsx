"use client";
import { useState } from "react";
import CommunityHeader from "../../../components/CommunityHeader";
import SiteFooter from "../../../components/SiteFooter";
import SkipLink from "../../../components/SkipLink";
import NightBanner from "../../../components/NightBanner";
import NightIcon from "../../../components/NightIcon";
import {useCommunityBoard,type PlaceFilter} from "../hooks/useCommunityBoard";
import CommunityPostList from "./CommunityPostList";
import NightCommunityStories from "./NightCommunityStories";
import NightCommunitySidebar from "./NightCommunitySidebar";
import type {CommunityLayout} from "../view-layout";
export default function CommunityPage({initialPlace=null}:{initialPlace?:PlaceFilter|null}) {
 const board=useCommunityBoard(initialPlace);
 const [layout,setLayout]=useState<CommunityLayout>('cards');
 const [sort,setSort]=useState('latest');
 const category=board.category, hasPresentation=!board.placeFilter&&board.page===1;
 const sortedBoard={...board,posts:[...board.posts].sort((a,b)=>sort==='popular'?b.likeCount-a.likeCount:sort==='comments'?b.commentCount-a.commentCount:b.createdAt-a.createdAt)};
 return <main className="community-page wave-night"><SkipLink href="#community-list">게시글 목록으로 바로가기</SkipLink><CommunityHeader/><NightBanner kind="community"/>
 <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
 <h2 id="community-list-title" className="sr-only">여행 후기와 질문</h2>
 <div className="night-community-toolbar"><div className="night-category-tabs" role="group" aria-label="게시판 선택">{[['','전체'],['general','여행 질문'],['place','관광지 이야기'],['review','여행 후기'],['tips','여행 꿀팁'],['together','함께 여행해요']].map(([key,label])=><button key={key} type="button" aria-pressed={category===key} onClick={()=>board.setCategory(key)}>{label}</button>)}</div>
 <form role="search" onSubmit={board.submitSearch}><NightIcon name="search"/><label className="sr-only" htmlFor="community-search">여행 후기 검색</label><input id="community-search" value={board.search} onChange={e=>board.setSearch(e.target.value)} placeholder="궁금한 내용을 검색해보세요." maxLength={80}/><button aria-label="검색" type="submit">검색</button></form><a className="night-primary" href={board.writeHref}><NightIcon name="edit"/>글 쓰기</a></div>
 {board.placeFilter&&<div className="community-place-filter"><b>{board.placeFilter.name}</b><button onClick={()=>board.setPlaceFilter(null)}>전체 후기 보기</button><p>여행자 후기는 작성자 한 명의 경험입니다. 방문 시점과 이동 조건을 함께 확인해 주세요.</p></div>}
 <div className="night-community-columns"><div>
 {hasPresentation&&<><div className="night-section-heading"><h2><NightIcon name="star" size={28}/>지금 주목받는 이야기</h2><button type="button" onClick={()=>document.getElementById('night-all-stories')?.scrollIntoView({behavior:'smooth'})}>더보기 <NightIcon name="arrow" size={18}/></button></div><NightCommunityStories featured category={category} query={board.query} sort={sort} layout={layout}/></>}
 <div className="night-sortbar" id="night-all-stories"><div role="group" aria-label="게시글 정렬">{[['latest','최신순'],['popular','인기순'],['comments','댓글순']].map(([key,label])=><button key={key} type="button" aria-pressed={sort===key} onClick={()=>setSort(key)}>{label}</button>)}</div><div role="group" aria-label="게시글 보기 방식"><button type="button" aria-pressed={layout==='cards'} onClick={()=>setLayout('cards')}><NightIcon name="grid" size={17}/>카드형</button><button type="button" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}><NightIcon name="list" size={17}/>목록형</button></div></div>
 {hasPresentation&&<NightCommunityStories featured={false} category={category} query={board.query} sort={sort} layout={layout}/>}
 {<CommunityPostList board={sortedBoard} layout={layout} hideEmpty={hasPresentation&&!board.query&&!category}/>}
 {category==='together'&&board.posts.length===0&&<div className="night-empty"><h3>함께할 여행을 이야기해보세요</h3><p>지역과 날짜, 함께하고 싶은 여행을 남겨주세요.</p><a href={board.writeHref}>동행 이야기 쓰기 →</a></div>}
 </div><NightCommunitySidebar onRegion={name=>{board.setPlaceFilter(null);board.setCategory('');board.setSearch(name);board.setQuery(name);}}/></div>
 </section><SiteFooter/></main>;
}
