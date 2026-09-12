"use client";
import LoadingState from "../../../components/LoadingState";
import {lazy,Suspense,useState} from 'react';
import type {useTripSelection} from '../hooks/useTripSelection';
import type {useItineraryRoutes} from '../hooks/useItineraryRoutes';
function BudgetUnavailable(){return <p role="alert">여행비 도구를 불러오지 못했어요. <button type="button" onClick={()=>window.location.reload()}>다시 불러오기</button></p>;}
const TripBudget=lazy(()=>import('./TripBudget').catch(()=>({default:BudgetUnavailable})));
export default function TripBudgetEntry({trip,coverage,region}:{trip:ReturnType<typeof useTripSelection>;coverage:ReturnType<typeof useItineraryRoutes>;region:string}){
 const [opened,setOpened]=useState(false);
 return <details data-planner-tool="budget" className="place-evidence" onToggle={event=>{if(event.currentTarget.open)setOpened(true);}}>
  <summary>여행비 계획하기</summary>
  {opened&&<Suspense fallback={<LoadingState>여행비 계획을 준비하고 있어요.</LoadingState>}><TripBudget trip={trip} routes={coverage.costByPlaceId} region={region}/></Suspense>}
 </details>;
}
