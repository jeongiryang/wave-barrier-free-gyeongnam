import {drawJourney,clamp} from '../source/journey-scene.mjs';
const doc=document.documentElement, motion=document.querySelector('#motion');
const mq=matchMedia('(prefers-reduced-motion: reduce)'), narrow=matchMedia('(max-width:760px)');
const connection=navigator.connection;
let manualReduce=false, reduced=mq.matches, frameId=0, journeyId=0, images=[], progress=1, playingJourney=false, destroyed=false;
const expansion=document.querySelector('.expansion'), win=document.querySelector('.expand-window'), copy=document.querySelector('.expand-copy');
const video=document.querySelector('#ocean-video'), videoButton=document.querySelector('#ocean-play'), videoStatus=document.querySelector('#ocean-status');
const canvas=document.querySelector('#journey-canvas'),ctx=canvas.getContext('2d'),poster=document.querySelector('#journey-poster'), journeyButton=document.querySelector('#journey-play');
function renderExpansion(){frameId=0;if(destroyed)return;if(reduced||narrow.matches){win.style.width='100%';win.style.height='';copy.style.opacity='1';copy.style.transform='none';return;}const r=expansion.getBoundingClientRect();const span=Math.max(1,r.height-innerHeight);const p=clamp(-r.top/span),e=p*p*(3-2*p);win.style.width=`${44+56*e}%`;win.style.height=`${36+64*e}svh`;copy.style.opacity=String(clamp((p-.68)/.22));copy.style.transform=`translateY(${18*(1-clamp((p-.68)/.22))}px)`;}
function schedule(){if(!frameId&&!destroyed)frameId=requestAnimationFrame(renderExpansion);}
function draw(){if(!images.length)return;drawJourney(ctx,progress,{font:'WavePreview, sans-serif',images});canvas.hidden=false;poster.hidden=true;}
function stopJourney(){cancelAnimationFrame(journeyId);journeyId=0;playingJourney=false;journeyButton.textContent='과정 재생';}
function stopVideo(unload=false){video.pause();videoButton.textContent='바다 영상 재생';if(unload){video.removeAttribute('src');video.load();}}
function preferences(){reduced=mq.matches||manualReduce;doc.classList.toggle('reduced',reduced);motion.setAttribute('aria-pressed',String(reduced));motion.textContent=reduced?'동작 줄이기 켜짐':'동작 줄이기';const blocked=reduced||!!connection?.saveData;videoButton.disabled=blocked;journeyButton.disabled=blocked;if(blocked){stopVideo(true);stopJourney();progress=1;draw();videoStatus.textContent=reduced?'동작 줄이기 설정으로 정지 화면을 표시합니다.':'데이터 절약 설정으로 정지 화면을 표시합니다.';}else videoStatus.textContent='';schedule();}
function onMotion(){manualReduce=!manualReduce;preferences();}
motion.addEventListener('click',onMotion);mq.addEventListener('change',preferences);narrow.addEventListener('change',schedule);connection?.addEventListener('change',preferences);
document.querySelector('#theme').addEventListener('click',e=>{const dark=doc.dataset.theme!=='dark';doc.dataset.theme=dark?'dark':'light';e.currentTarget.setAttribute('aria-pressed',String(dark));e.currentTarget.textContent=dark?'밝은 화면':'어두운 화면';});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
const statuses=['여행할 날짜를 선택하는 단계입니다.','고른 장소를 같은 날짜에 순서대로 담는 단계입니다.','같은 장소가 일정 순서대로 연결됩니다. 실제 길찾기 결과가 아닌 설명용 예시입니다.'];
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{stopJourney();progress=[.23,.55,1][Number(b.dataset.step)];draw();document.querySelectorAll('[data-step]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelector('#step-status').textContent=statuses[Number(b.dataset.step)];}));
journeyButton.addEventListener('click',()=>{if(playingJourney){stopJourney();return;}if(reduced||connection?.saveData)return;playingJourney=true;journeyButton.textContent='과정 정지';const start=performance.now();function tick(t){if(destroyed||!playingJourney)return;progress=clamp((t-start)/9000);draw();const phase=progress<.33?0:progress<.67?1:2;document.querySelectorAll('[data-step]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.step)===phase)));if(progress<1)journeyId=requestAnimationFrame(tick);else{stopJourney();document.querySelector('#step-status').textContent=statuses[2];}}journeyId=requestAnimationFrame(tick);});
videoButton.addEventListener('click',async()=>{if(reduced||connection?.saveData)return;if(!video.paused){stopVideo();return;}try{if(!video.getAttribute('src'))video.src='../video/ocean-surface-loop.mp4';await video.play();videoButton.textContent='바다 영상 정지';videoStatus.textContent='';}catch{videoStatus.textContent='영상을 재생하지 못했습니다. 정지 화면으로 볼 수 있어요.';stopVideo();}});
video.addEventListener('error',()=>{videoStatus.textContent='영상을 불러오지 못했습니다. 정지 화면으로 볼 수 있어요.';stopVideo();});
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(!e.isIntersecting){if(e.target===video)stopVideo();else stopJourney();}},{threshold:.05});observer.observe(video);observer.observe(canvas);
function visibility(){if(document.hidden){stopVideo();stopJourney();}}document.addEventListener('visibilitychange',visibility);
async function loadScene(){await document.fonts.ready;images=await Promise.all(['hero-coast','garden-discovery','harbor-closing'].map(name=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=`../images/${name}-small.webp`;})));draw();}
const lazy=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){lazy.disconnect();loadScene();}},{rootMargin:'200px'});lazy.observe(canvas.parentElement);
// When adapting to React, perform equivalent disposal in the effect cleanup.
function dispose(){destroyed=true;cancelAnimationFrame(frameId);stopJourney();stopVideo();observer.disconnect();lazy.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',schedule);mq.removeEventListener('change',preferences);narrow.removeEventListener('change',schedule);connection?.removeEventListener('change',preferences);document.removeEventListener('visibilitychange',visibility);}
addEventListener('pagehide',e=>{if(!e.persisted)dispose();else visibility();});preferences();
