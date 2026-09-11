"use client";
import Link from 'next/link';
import {useState} from 'react';
import {createTravelBookSnapshot,upsertTravelBook,sanitizeTravelBooks,TRAVEL_BOOK_STORAGE_KEY,TRAVEL_BOOK_MAX_ITEMS,type TravelBookInput} from '../../../lib/travel-book.js';
import CloudSaveAction from '../../account-travel/CloudSaveAction';
import {courseActions,courseCopy,coursePrimary} from './small-trip-styles';

export default function OutingArchive({input}:{input:TravelBookInput}){
 const [notice,setNotice]=useState('');
 const book=createTravelBookSnapshot(input);
 function save(){
  if(!book)return;
  try{
   const raw=localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY),parsed=JSON.parse(raw||'[]');
   if(!Array.isArray(parsed))throw Error('Invalid archive');
   const previous=sanitizeTravelBooks(parsed);
   if(previous.length!==parsed.length)throw Error('Unknown archive data');
   if(previous.length>=TRAVEL_BOOK_MAX_ITEMS&&!previous.some(item=>item.fingerprint===book.fingerprint)){setNotice('저장한 일정이 20개예요. 내 일정에서 필요한 여행을 정리한 뒤 다시 저장해 주세요.');return;}
   localStorage.setItem(TRAVEL_BOOK_STORAGE_KEY,JSON.stringify(upsertTravelBook(previous,book)));
   setNotice('짧은 나들이를 내 일정에 저장했어요. 출발·복귀 기준과 예상 시각은 여행 메모에서도 볼 수 있어요.');
  }catch{setNotice('일정을 저장하지 못했어요. 이 화면의 선택은 유지됩니다. 저장 공간과 브라우저 설정을 확인해 주세요.');}
 }
 return <div><div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!book} onClick={save}>짧은 나들이 저장</button><Link href="/travel-book">저장한 일정 보기 →</Link></div><p role="status" style={courseCopy}>{notice}</p>{book&&<CloudSaveAction book={book}/>}</div>;
}
