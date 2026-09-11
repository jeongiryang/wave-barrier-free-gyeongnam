import { directDistanceKm } from '../features/planner/optimization/visit-order.js';
import { buildItinerarySchedule, travelDurationBetween, parseClock, formatScheduleTime } from '../features/planner/optimization/itinerary-schedule.js';
import { validTripClock } from './trip-time-constraints.js';
import { validTripDate } from './trip-dates.js';

const publicId=value=>typeof value==='string'&&/^[1-9]\d{0,11}$/.test(value);
function facilityCandidate(place,requiredKeys,includeUnknown){
 if(!publicId(place?.id)||!Array.isArray(requiredKeys)||!requiredKeys.length)return null;
 const fields=requiredKeys.map(key=>place.accessibility?.find(field=>field.key===key));
 if(fields.some(field=>field?.state==='negative'))return null;
 const unknownKeys=requiredKeys.filter((key,index)=>fields[index]?.state!=='confirmed');
 return unknownKeys.length&&!includeUnknown?null:unknownKeys;
}

export function outingCandidates({places=[],requiredKeys=[],includeUnknown=false,origin}) {
 const seen=new Set();
 return (Array.isArray(places)?places:[]).flatMap(place=>{
  const unknownKeys=facilityCandidate(place,requiredKeys,includeUnknown),distanceKm=directDistanceKm(origin,place);
  if(!unknownKeys||distanceKm===null||seen.has(place.id)||['25','32'].includes(place.contentTypeId))return [];
  seen.add(place.id);return[{place,unknownKeys,distanceKm}];
 }).sort((a,b)=>a.unknownKeys.length-b.unknownKeys.length||a.distanceKm-b.distanceKm).slice(0,12);
}

export function courseCandidates({places=[],anchor,savedIds=[],requiredKeys=[],includeUnknown=false,purpose='visit',radiusKm=5}) {
 if(!publicId(anchor?.id) || !['visit','food','rest'].includes(purpose) || ![3,5,10].includes(radiusKm))return [];
 const seen=new Set(savedIds);
 return (Array.isArray(places)?places:[]).flatMap(place=>{
  const unknownKeys=facilityCandidate(place,requiredKeys,includeUnknown);
  if(!unknownKeys||place.id===anchor.id||seen.has(place.id))return [];seen.add(place.id);
  const distanceKm=directDistanceKm(anchor,place);
  if(distanceKm===null||distanceKm>radiusKm)return [];
  if(purpose==='food'&&place.contentTypeId!=='39')return [];
  if(purpose!=='food'&&['32','39','25'].includes(place.contentTypeId))return [];
  return[{place,distanceKm,unknownKeys,travelMinutes:travelDurationBetween(anchor,place).minutes}];
 }).sort((a,b)=>a.unknownKeys.length-b.unknownKeys.length||a.distanceKm-b.distanceKm).slice(0,6);
}

export function previewOuting({places=[],date,startTime,hours,stayMinutes,origin}) {
 if(!validTripDate(date)||!validTripClock(startTime)||!Number.isInteger(hours)||hours<1||hours>6||!Number.isInteger(stayMinutes)||stayMinutes<15||stayMinutes>120||!Array.isArray(places)||!places.length||places.length>2||places.some(place=>!publicId(place?.id))||new Set(places.map(place=>place.id)).size!==places.length)return null;
 const start=parseClock(startTime),deadline=start+hours*60;
 if(deadline>=24*60||places.some(place=>directDistanceKm(origin,place)===null))return null;
 const visitMinutesByPlaceId=Object.fromEntries(places.map(place=>[place.id,stayMinutes]));
 const entries=buildItinerarySchedule({places,days:[date],startTime,origin,visitMinutesByPlaceId})[0].entries;
 const returnMinutes=travelDurationBetween(places.at(-1),origin).minutes;
 const projectedEnd=entries.at(-1).endsAt+returnMinutes;
 return{entries,visitMinutesByPlaceId,returnMinutes,totalMinutes:projectedEnd-start,endLabel:formatScheduleTime(projectedEnd),deadlineLabel:formatScheduleTime(deadline),fits:projectedEnd<=deadline,remainingMinutes:deadline-projectedEnd};
}

export function outingFingerprint(value){
 const input=JSON.stringify(value);let hash=5381;for(let index=0;index<input.length;index++)hash=((hash<<5)+hash)^input.charCodeAt(index);
 return 'outing-'+(hash>>>0).toString(36);
}
