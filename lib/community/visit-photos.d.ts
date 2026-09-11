export type VisitPhoto={dataUrl:string;width:number;height:number;caption:string};
export const MAX_VISIT_PHOTOS:number;
export const MAX_VISIT_PHOTO_BYTES:number;
export const MAX_VISIT_PHOTO_SIDE:number;
export function stripVisitPhotoMetadata(dataUrl:unknown):Omit<VisitPhoto,'caption'>;
export function normalizeVisitPhotos(value:unknown):{photos:VisitPhoto[];error?:undefined}|{photos?:undefined;error:string};
