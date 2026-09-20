"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
type Group = 'comfort' | 'journey' | 'readiness';
export const toolSurfaceGroup = (id: string): Group | null => id === 'comfort' ? 'comfort' : ['readiness','weather','layers','crowd','equipment-rental'].includes(id) ? 'readiness' : ['receipt','alternatives','course','budget','on-trip','offline','transport','split','experience','audio','coordinates','route-check'].includes(id) ? 'journey' : null;
const targets: Record<string,string> = { comfort: '.simple-day-options > summary', readiness: '.simple-readiness', weather: '.weather-heading > button', audio: '.simple-audio-journal > summary', coordinates: '[data-coordinate-recovery]', 'route-check': '.itinerary-route-coverage', experience: '.travel-experience', layers:'#layers > summary',crowd:'#crowd h3','equipment-rental':'#equipment-rental' };
type Value = { hosts: Partial<Record<Group,HTMLElement>>; register: (group:Group, node:HTMLElement|null)=>void; request: { id:string; sequence:number }; open:(id:string)=>void };
const Context = createContext<Value | null>(null);
export function PlannerToolProvider({children}:{children:ReactNode}) {
 const [hosts,setHosts]=useState<Value['hosts']>({});
 const [request,setRequest]=useState({id:'',sequence:0});
 const register=useCallback((group:Group,node:HTMLElement|null)=>setHosts(previous=>previous[group]===node ? previous : {...previous,[group]:node || undefined}),[]);
 const open=useCallback((id:string)=>setRequest(previous=>({id,sequence:previous.sequence+1})),[]);
 const value=useMemo(()=>({hosts,register,request,open}),[hosts,register,request,open]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePlannerTools(){ const value=useContext(Context); if(!value) throw new Error('PlannerToolProvider missing'); return value; }
export function PlannerToolPortal({group,children}:{group:Group;children:ReactNode}) { const {hosts}=usePlannerTools(); return hosts[group] ? createPortal(children,hosts[group]) : null; }
function Host({group,active}:{group:Group;active:boolean}) { const {register}=usePlannerTools(); const [visited,setVisited]=useState(active); if(active && !visited)setVisited(true); const ref=useCallback((node:HTMLDivElement|null)=>register(group,node),[group,register]); return visited ? <div ref={ref} hidden={!active} data-naru-tool-surface={group}/> : null; }
export function PlannerToolSurfaces({visible}:{visible:boolean}) {
 const {request,hosts}=usePlannerTools(); const group=toolSurfaceGroup(request.id);
 useEffect(()=>{ if(!visible || !group) return; const host=hosts[group]; if(!host) return;
 let frame=0; let revealFrame=0; let settled=false; let follow=true; let focusedNode:HTMLElement|null=null;
 const scroller=host.closest<HTMLElement>('.naru-workspace-content');
 const keepFocusedTargetVisible=()=>{
   cancelAnimationFrame(revealFrame);
   if(!follow || !focusedNode || !scroller) return;
   revealFrame=requestAnimationFrame(()=>{
     if(!follow || !focusedNode?.isConnected || document.activeElement!==focusedNode) return;
     const target=focusedNode.getBoundingClientRect(), bounds=scroller.getBoundingClientRect();
     if(target.top<bounds.top+8 || target.bottom>bounds.bottom-8) focusedNode.scrollIntoView({block:'nearest',behavior:'instant'});
   });
 };
 // A lazy weather panel above the requested heading can expand after first
 // focus. Keep that heading visible until the visitor takes control of scrolling.
 const resizeObserver=new ResizeObserver(keepFocusedTargetVisible);
 resizeObserver.observe(host); if(scroller) resizeObserver.observe(scroller);
 const stopFollowing=()=>{follow=false;cancelAnimationFrame(revealFrame);};
 const interaction=new AbortController();
 for(const event of ['wheel','touchstart','pointerdown','keydown']) window.addEventListener(event,stopFollowing,{capture:true,passive:true,signal:interaction.signal});
 const observer=new MutationObserver(()=>{if(!settled){cancelAnimationFrame(frame);frame=requestAnimationFrame(focus);}});
 const focus=()=>{ const node=host.querySelector<HTMLElement>(targets[request.id] || `[data-planner-tool="${request.id}"]`); if(!node) return;
 for(let parent:HTMLElement|null=node;parent && parent!==host;parent=parent.parentElement) if(parent instanceof HTMLDetailsElement) parent.open=true;
 if(!node.getClientRects().length) return;
 settled=true; observer.disconnect();
 if(node instanceof HTMLButtonElement && ['on-trip','offline','transport','split'].includes(request.id) && node.getAttribute('aria-pressed')!=='true') node.click();
 if(!node.matches('button,summary,a,input,select')) node.tabIndex=-1; node.focus({preventScroll:true}); node.scrollIntoView({block:'nearest'}); focusedNode=node; keepFocusedTargetVisible();
 };
 observer.observe(host,{childList:true,subtree:true}); frame=requestAnimationFrame(focus); const timer=setTimeout(()=>observer.disconnect(),5000); return ()=>{clearTimeout(timer);cancelAnimationFrame(frame);cancelAnimationFrame(revealFrame);observer.disconnect();resizeObserver.disconnect();interaction.abort();};
 },[visible,group,request,hosts]);
 return <div className="naru-live-tools" hidden={!visible || !group}>{(['comfort','journey','readiness'] as const).map(item=><Host key={item} group={item} active={group===item}/>)}</div>;
}
