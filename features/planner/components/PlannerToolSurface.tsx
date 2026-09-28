"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
type Group = 'comfort' | 'journey' | 'readiness' | 'browse' | 'planning';
export const toolSurfaceGroup = (id: string): Group | null => ['conditions','facilities','places','compare'].includes(id) ? 'browse' : ['dates','itinerary','map','save','share','calendar'].includes(id) ? 'planning' : id === 'comfort' ? 'comfort' : ['readiness','weather','layers','crowd','equipment-rental'].includes(id) ? 'readiness' : ['receipt','alternatives','course','budget','on-trip','offline','transport','split','experience','audio','coordinates','route-check'].includes(id) ? 'journey' : null;
const targets: Record<string,string> = { conditions:'[role="combobox"]', facilities:'.simple-facility-trigger', places:'#places', compare:'#places', dates:'[data-itinerary-settings], #itinerary-setup input', itinerary:'#itinerary', map:'#navigation', save:'[data-planner-tool="save"] > button', share:'[data-planner-tool="share"]', calendar:'[data-planner-tool="share"]', comfort: '.simple-day-options > summary', readiness: '.simple-readiness', weather: '.weather-heading > button', audio: '.simple-audio-journal > summary', coordinates: '[data-coordinate-recovery]', 'route-check': '.itinerary-route-coverage', experience: '.travel-experience', layers:'#layers > summary',crowd:'#crowd h3','equipment-rental':'#equipment-rental' };
type Value = { visible:boolean; setVisible:(value:boolean)=>void; hosts: Partial<Record<Group,HTMLElement>>; register: (group:Group, node:HTMLElement|null)=>void; request: { id:string; sequence:number }; open:(id:string)=>void };
const Context = createContext<Value | null>(null);
export function PlannerToolProvider({children}:{children:ReactNode}) {
 const [visible,setVisible]=useState(false);
 const [hosts,setHosts]=useState<Value['hosts']>({});
 const [request,setRequest]=useState({id:'',sequence:0});
 const register=useCallback((group:Group,node:HTMLElement|null)=>setHosts(previous=>previous[group]===node ? previous : {...previous,[group]:node || undefined}),[]);
 const open=useCallback((id:string)=>setRequest(previous=>({id,sequence:previous.sequence+1})),[]);
 const value=useMemo(()=>({visible,setVisible,hosts,register,request,open}),[visible,hosts,register,request,open]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePlannerTools(){ const value=useContext(Context); if(!value) throw new Error('PlannerToolProvider missing'); return value; }
export function PlannerToolPortal({group,children}:{group:Group;children:ReactNode}) {
 const {hosts,visible,request}=usePlannerTools();
 const inline=group==='browse'||group==='planning';
 const home=useRef<HTMLDivElement>(null);
 const [mount,setMount]=useState<HTMLDivElement|null>(null);
 useLayoutEffect(()=>{const frame=requestAnimationFrame(()=>{
   const element=document.createElement('div');
   element.style.display='contents';
   setMount(element);
 });return ()=>cancelAnimationFrame(frame);},[]);
 const inNaru=inline && visible && toolSurfaceGroup(request.id)===group && Boolean(hosts[group]);
 // Move the same portal host; changing the portal target itself remounts drafts.
 useLayoutEffect(()=>{
   if(!mount) return;
   const destination=inNaru || !inline ? hosts[group] : home.current;
   if(destination && mount.parentElement!==destination) destination.appendChild(mount);
 },[mount,inNaru,inline,hosts,group]);
 return <>{inline && <div ref={home} style={{display:'contents'}}/>}{mount && (inline || hosts[group]) && createPortal(children,mount)}</>;
}
export function PlannerToolSection({tools,children}:{tools:string[];children:ReactNode}) {
 const {request}=usePlannerTools();
 const active=tools.includes(request.id);
 const [visited,setVisited]=useState(active);
 if(active && !visited)setVisited(true);
 // Keep local drafts mounted when moving between tools, while exposing only
 // the selected task to sighted and screen-reader users.
 return visited ? <div className="naru-selected-tool" hidden={!active}>{children}</div> : null;
}
function Host({group,active}:{group:Group;active:boolean}) { const {register}=usePlannerTools(); const [visited,setVisited]=useState(active); if(active && !visited)setVisited(true); const ref=useCallback((node:HTMLDivElement|null)=>register(group,node),[group,register]); return visited ? <div ref={ref} hidden={!active} data-naru-tool-surface={group}/> : null; }
export function PlannerToolSurfaces({visible}:{visible:boolean}) {
 const {request,hosts,setVisible}=usePlannerTools();
 const actionSequence=useRef<number|null>(null);
 useEffect(()=>{setVisible(visible);return ()=>setVisible(false);},[visible,setVisible]);
 const group=toolSurfaceGroup(request.id);
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
 const stopFollowing=()=>{follow=false;settled=true;cancelAnimationFrame(frame);cancelAnimationFrame(revealFrame);observer.disconnect();};
 const interaction=new AbortController();
 for(const event of ['wheel','touchstart','pointerdown','keydown']) window.addEventListener(event,stopFollowing,{capture:true,passive:true,signal:interaction.signal});
 const observer=new MutationObserver(()=>{if(!settled){cancelAnimationFrame(frame);frame=requestAnimationFrame(focus);}});
 const focus=()=>{ if(!follow) return; const node=host.querySelector<HTMLElement>(targets[request.id] || `[data-planner-tool="${request.id}"]`); if(!node) return;
 for(let parent:HTMLElement|null=node;parent && parent!==host;parent=parent.parentElement) if(parent instanceof HTMLDetailsElement) parent.open=true;
 if(!node.getClientRects().length || node.matches(':disabled')) return;
 settled=true; observer.disconnect();
 if(node instanceof HTMLButtonElement && ['on-trip','offline','transport','split'].includes(request.id) && node.getAttribute('aria-pressed')!=='true') node.click();
 if(!node.matches('button,summary,a,input,select')) node.tabIndex=-1; node.focus({preventScroll:true}); node.scrollIntoView({block:'nearest'}); focusedNode=node; keepFocusedTargetVisible();
 if(actionSequence.current!==request.sequence) {
   if(['dates','facilities','share','calendar'].includes(request.id) && node instanceof HTMLButtonElement && !node.disabled) { actionSequence.current=request.sequence; node.click(); }
   if(request.id==='compare') { actionSequence.current=request.sequence; window.dispatchEvent(new Event('wave:open-comparison')); }
 }
 };
 observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden']}); frame=requestAnimationFrame(focus); const timer=setTimeout(()=>observer.disconnect(),5000); return ()=>{clearTimeout(timer);cancelAnimationFrame(frame);cancelAnimationFrame(revealFrame);observer.disconnect();resizeObserver.disconnect();interaction.abort();};
 },[visible,group,request,hosts]);
 return <div className="naru-live-tools" hidden={!visible || !group}>{(['comfort','journey','readiness','browse','planning'] as const).map(item=><Host key={item} group={item} active={group===item}/>)}</div>;
}
