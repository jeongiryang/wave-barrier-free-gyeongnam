import type { ProviderContext } from "../../lib/provider-failure.js";
type ProviderResponse = Pick<Response,"ok"|"status"|"headers"|"text"> & {json():Promise<unknown>};
type Requester = (context:ProviderContext,url:string,options:RequestInit,fetcher?:typeof fetch)=>Promise<ProviderResponse>;
export function createProviderRequester(options?:{now?:()=>number;random?:()=>number}): Requester;
export const requestProvider:Requester;
