// Generated from source/journey-scene.mjs + preview/cinematic.mjs; no bundler dependency.
(()=>{
// Original WAVE explanatory motion. Illustrative layout, not live route data.
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
function drawJourney(ctx, progress, { font = 'sans-serif', images = [] } = {}) {
  const W = 1280, H = 720, p = clamp(progress);
  ctx.save(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#eef7fc'; ctx.fillRect(0, 0, W, H);
  const text = (s, x, y, size, color = '#06304a', weight = 500) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.fillText(s, x, y);
  };
  const line = (x1,y1,x2,y2,color,width=1) => {ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
  text('고른 장소가, 하나의 여행으로.', 64, 75, 38, '#06304a', 700);
  text('날짜를 고르고 · 일정을 담고 · 이동을 이어보세요',64,115,18,'#0f4f70');
  const labels = ['01  날짜 선택','02  일정 구성','03  이동 확인'];
  labels.forEach((s,i) => {
    const active = p >= i/3;
    text(s,64+i*390,167,16,active?'#074f84':'#52788c',600);
    line(64+i*390,184,414+i*390,184,active?'#0a6baf':'#cbe1ed',active?3:1);
  });
  // Open editorial calendar: large type, no nested dashboard cards.
  text('09',67,295,92,'#06304a',400);
  text('여행할 날짜',214,260,18,'#0f4f70');
  text('함께 떠날 하루를 골라요',214,291,17,'#0f4f70');
  const days = ['월','화','수','목','금','토','일'];
  days.forEach((s,i) => text(s,82+i*61,345,17,'#52788c'));
  for(let i=0;i<21;i++) {
    const x=90+(i%7)*61,y=392+Math.floor(i/7)*55;
    const selected=i===11;
    if(selected){ctx.globalAlpha=ease(p/.2);ctx.fillStyle='#0a6baf';ctx.beginPath();ctx.arc(x,y-7,22,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    text(String(i+1).padStart(2,'0'),x-13,y,19,selected&&p>.1?'#ffffff':'#06304a',selected?700:400);
  }
  line(560,220,560,625,'#cbe1ed');
  const cards=ease((p-.24)/.26), route=ease((p-.56)/.32);
  const points=[[680,315],[895,435],[1120,302]];
  // Connection is deliberately schematic and never presented as map geometry.
  ctx.strokeStyle='#cbe1ed'; ctx.lineWidth=3;ctx.setLineDash([5,8]);
  ctx.beginPath();ctx.moveTo(680,315);ctx.bezierCurveTo(775,310,790,435,895,435);ctx.bezierCurveTo(1000,435,1020,302,1120,302);ctx.stroke();ctx.setLineDash([]);
  ctx.save();ctx.beginPath();ctx.rect(635,210,535*route,355);ctx.clip();
  ctx.strokeStyle='#0a6baf';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(680,315);ctx.bezierCurveTo(775,310,790,435,895,435);ctx.bezierCurveTo(1000,435,1020,302,1120,302);ctx.stroke();ctx.restore();
  points.forEach(([x,y],i)=>{
    ctx.save();ctx.globalAlpha=.18+.82*ease((cards-i*.16)/.65);
    ctx.shadowColor='rgba(4,32,47,.10)';ctx.shadowBlur=18;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,54,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    if(images[i]){ctx.save();ctx.beginPath();ctx.arc(x,y,49,0,Math.PI*2);ctx.clip();const im=images[i],s=Math.max(98/im.width,98/im.height);ctx.drawImage(im,x-im.width*s/2,y-im.height*s/2,im.width*s,im.height*s);ctx.restore();}
    ctx.fillStyle='#06304a';ctx.beginPath();ctx.arc(x+38,y+38,17,0,Math.PI*2);ctx.fill();text(String(i+1),x+33,y+44,15,'#fff',700);
    text(['첫 번째 장소','두 번째 장소','세 번째 장소'][i],x-46,y+91,16,'#06304a',600);ctx.restore();
  });
  ctx.globalAlpha=cards;
  text('12일',69,584,30,'#06304a',700);
  text('장소 1 → 장소 2 → 장소 3',166,582,20,'#0f4f70');
  text('나의 일정',69,618,16,'#52788c');ctx.globalAlpha=1;
  ctx.globalAlpha=route;text('같은 장소, 같은 순서로.',675,595,26,'#06304a',600);ctx.globalAlpha=1;
  text('기능 설명용 예시 · 가상 이미지와 개념 연결이며 실제 길찾기 결과가 아닙니다.',64,683,14,'#52788c');
  ctx.restore();
}

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

})();
