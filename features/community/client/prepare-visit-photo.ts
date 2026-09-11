import {MAX_VISIT_PHOTO_BYTES,MAX_VISIT_PHOTO_SIDE,stripVisitPhotoMetadata} from '../../../lib/community/visit-photos.js';
import type {VisitPhoto} from '../../../lib/community/visit-photos.js';

export async function prepareVisitPhoto(file:File):Promise<VisitPhoto>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>6*1024*1024)throw new Error('6MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('사진을 열지 못했어요. JPG, PNG, WebP 형식으로 다시 저장한 뒤 선택해 주세요.');}
 try{
  if(!bitmap.width||!bitmap.height||Math.max(bitmap.width,bitmap.height)>10000)throw new Error('사진 크기가 너무 커요. 가로·세로 10,000px 이하로 줄여 주세요.');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('사진을 준비하지 못했어요. 다른 브라우저에서 다시 시도해 주세요.');
  for(const side of [MAX_VISIT_PHOTO_SIDE,640,512]){
   const ratio=Math.min(1,side/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.65,.45]){
    const dataUrl=canvas.toDataURL('image/jpeg',quality);
    if((dataUrl.length-dataUrl.indexOf(',')-1)*.75<=MAX_VISIT_PHOTO_BYTES)return {...stripVisitPhotoMetadata(dataUrl),caption:''};
   }
  }
  throw new Error('사진 용량을 충분히 줄이지 못했어요. 필요한 시설이나 동선이 보이도록 잘라서 다시 선택해 주세요.');
 }finally{bitmap.close();}
}
