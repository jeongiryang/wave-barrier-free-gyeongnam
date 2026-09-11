// Only the disclosed vocabulary and public places already on screen are accepted.
const normalize=value=>String(value??'').normalize('NFKC').replace(/[.,!?。！？"'“”‘’]/g,' ').replace(/\s+/g,' ').trim();
const compact=value=>normalize(value).replace(/\s/g,'');
const verbs=[
 ['open',/(?:의\s*)?(?:정보\s*보여\s*줘|상세\s*보기|자세히\s*보여\s*줘)$/],
 ['add',/(?:일정에\s*)?(?:담아\s*줘|추가해\s*줘|추가하기|담기)$/],
 ['remove',/(?:일정에서\s*)?(?:빼\s*줘|제거해\s*줘|삭제해\s*줘|빼기)$/],
];
export function parseTravelCommand(value,places=[]) {
 if(typeof value!=='string'||value.length>200)return{status:'unrecognized',action:null,choices:[]};
 const text=normalize(value);
 if(/^(?:다음\s*장소)(?:\s*보여\s*줘|\s*보기)?$/.test(text))return{status:'next',action:'next',choices:[]};
 for(const[action,pattern]of verbs){
  if(!pattern.test(text))continue;
  const target=text.replace(pattern,'').trim();
  const names=[compact(target),compact(target.replace(/[을를]$/,''))].filter(Boolean);
  const seen=new Set();
  const choices=places.filter(place=>{
   if(!place||!/^[1-9]\d{0,11}$/.test(place.id)||typeof place.name!=='string'||!names.includes(compact(place.name))||seen.has(place.id))return false;
   seen.add(place.id);return true;
  }).map(place=>({id:place.id,name:place.name,city:place.city||''}));
  if(!choices.length)return{status:'not-found',action,choices:[]};
  return{status:choices.length===1?'preview':'choose',action,choices};
 }
 return{status:'unrecognized',action:null,choices:[]};
}
