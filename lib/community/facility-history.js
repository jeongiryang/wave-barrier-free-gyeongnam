import {ACCESSIBILITY_REPORT_FIELDS,communityToday,normalizeAccessibilityReports,validCommunityDate} from './field-report.js';

/** A journal's secondary places must not inherit the primary place's facility reports. */
export function facilityHistory(posts,placeId,now=Date.now()){
 const today=communityToday(now),valid=[];
 for(const post of Array.isArray(posts)?posts.slice(0,200):[]){
  const day=validCommunityDate(post?.visitDate);
  if(post?.category!=='review'||post.placeId!==placeId||!day||day>today||typeof post.id!=='string')continue;
  for(const report of normalizeAccessibilityReports(post.fieldReports))valid.push({...report,postId:post.id,visitDate:day,createdAt:Number.isFinite(post.createdAt)?post.createdAt:0,title:typeof post.title==='string'?post.title.slice(0,120):'현장 후기',authorName:typeof post.authorName==='string'?post.authorName.slice(0,120):'여행자'});
 }
 return ACCESSIBILITY_REPORT_FIELDS.map(field=>{
  const observations=valid.filter(item=>item.field===field.id).sort((a,b)=>b.visitDate.localeCompare(a.visitDate)||b.createdAt-a.createdAt),latest=observations[0];
  const sameDay=new Set(observations.filter(item=>item.visitDate===latest?.visitDate&&item.status!=='not_checked').map(item=>item.status));
  return {field:field.id,label:field.label,latest:latest||null,observations,conflict:sameDay.has('confirmed')&&sameDay.has('changed'),ageDays:latest?Math.max(0,Math.floor((Date.parse(today)-Date.parse(latest.visitDate))/86400000)):null};
 });
}
export function fieldReportDraftHref({placeId,placeName,region,field,status}){
 const selected=ACCESSIBILITY_REPORT_FIELDS.find(item=>item.id===field);
 if(!selected||!['confirmed','changed'].includes(status)||typeof placeId!=='string'||!placeId||typeof placeName!=='string'||!placeName)return '/community/new';
 const params=new URLSearchParams({category:'review',placeId:placeId.slice(0,100),placeName:placeName.slice(0,120),region:typeof region==='string'?region.slice(0,20):'',field:selected.id,observation:status});
 return '/community/new?'+params;
}
export function parseFieldReportDraft(params){
 const field=params.get('field'),status=params.get('observation');
 return ACCESSIBILITY_REPORT_FIELDS.some(item=>item.id===field)&&['confirmed','changed'].includes(status)&&params.get('placeId')?[{field,status,note:''}]:[];
}
