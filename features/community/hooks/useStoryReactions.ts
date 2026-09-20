'use client';
import { useSyncExternalStore } from 'react';
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const reactionKey = 'wave-community-reactions-v1';
let reactionCache = '{"liked":[],"saved":[]}';
const serverReactions = () => '{"liked":[],"saved":[]}';
function readReactions() { try { return localStorage.getItem(reactionKey) || reactionCache; } catch { return reactionCache; } }
function subscribeReactions(notify:()=>void) {
 const stored = (event:StorageEvent) => { if(event.key===reactionKey || event.key===null)notify(); };
 window.addEventListener('storage',stored); window.addEventListener(reactionKey,notify);
 return ()=>{window.removeEventListener('storage',stored);window.removeEventListener(reactionKey,notify);};
}
function storeReactions(next:{liked:string[];saved:string[]}) {
 reactionCache=JSON.stringify(next);
 try { localStorage.setItem(reactionKey,reactionCache); } catch {}
 window.dispatchEvent(new Event(reactionKey));
}
export function useStoryReactions() {
 const ready=useSyncExternalStore(subscribeHydration,clientReady,serverReady);
 const stored=useSyncExternalStore(subscribeReactions,readReactions,serverReactions);
 let reactions:{liked:string[];saved:string[]}={liked:[],saved:[]};
 try { const parsed=JSON.parse(stored); if(Array.isArray(parsed.liked)&&Array.isArray(parsed.saved))reactions=parsed; } catch {}
 function toggle(kind:'liked'|'saved',id:string) {
  const values=reactions[kind];
  storeReactions({...reactions,[kind]:values.includes(id)?values.filter(value=>value!==id):[...values,id]});
 }
 return {...reactions,toggle,ready};
}
