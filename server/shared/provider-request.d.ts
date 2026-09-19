import type { ProviderContext } from "../../lib/provider-failure.js";
type ProviderResponse = Pick<Response,"ok"|"status"|"headers"|"text"> & {json():Promise<unknown>;body?:ReadableStream<Uint8Array>|null};
/** `stream` forwards the body instead of buffering it; failures stay status-classified. */
type StreamingContext = ProviderContext & {stream?:boolean};
type Requester = (context:StreamingContext,url:string,options:RequestInit,fetcher?:typeof fetch)=>Promise<ProviderResponse>;
export function createProviderRequester(options?:{now?:()=>number;random?:()=>number}): Requester;
export const requestProvider:Requester;
