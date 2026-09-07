// Offline deterministic motion-graphics renderer. No network, credentials or API calls.
// npm install @napi-rs/canvas in an isolated media workspace; FFmpeg must be on PATH.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
let lib;
try {lib=require('@napi-rs/canvas');} catch {
  if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw new Error('Install @napi-rs/canvas');
  lib=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
}
const {createCanvas,loadImage,GlobalFonts}=lib;
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','WaveSans');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','WaveBold');
const dir=path.dirname(fileURLToPath(import.meta.url));
const pics=await Promise.all(['coast-dawn.webp','garden-discovery.webp','harbor-night.webp'].map(f=>loadImage(path.join(dir,f))));
const W=1280,H=720,FPS=24;
const canvas=createCanvas(W,H),c=canvas.getContext('2d');
const navy='#082e39',cream='#f5f0e4',mint='#9dedcf',coral='#f3937c';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
function rect(x,y,w,h,r=0,fill=cream){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(s,x,y,size=24,color=cream,bold=false){c.fillStyle=color;c.font=`${size}px ${bold?'WaveBold':'WaveSans'}`;c.fillText(s,x,y);}
function cover(im,x,y,w,h){let s=Math.max(w/im.width,h/im.height);c.drawImage(im,x+(w-im.width*s)/2,y+(h-im.height*s)/2,im.width*s,im.height*s);}
function photo(im,x,y,w,h,r=22){c.save();c.beginPath();c.roundRect(x,y,w,h,r);c.clip();cover(im,x,y,w,h);c.restore();}
function reveal(s,x,y,size,time,color=cream){c.save();c.beginPath();c.rect(x-5,y-size-12,1200,size+30);c.clip();text(s,x,y+80*(1-ease(time)),size,color,true);c.restore();}
function line(points,color,width=3,progress=1){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();let n=Math.floor(clamp(progress)*(points.length-1));for(let i=0;i<=n;i++){let p=points[i];i?c.lineTo(...p):c.moveTo(...p);}c.stroke();}
function waves(t,color=mint,opacity=.15,base=535,periodic=false){c.save();c.globalAlpha=opacity;for(let j=0;j<12;j++){const pts=[];for(let x=-20;x<1320;x+=12)pts.push([x,base+j*13+Math.sin(x/240-t*(periodic?1:1.15)+j*.18)*50+Math.sin(x/110+t*(periodic?2:.6))*8]);line(pts,color,1.2);}c.restore();}
function particles(t){c.save();for(let i=0;i<35;i++){let x=(i*117.3+t*19)%W,y=(i*71.9)%H;c.globalAlpha=.08+.12*(.5+.5*Math.sin(t+i));c.fillStyle=mint;c.beginPath();c.arc(x,y,1.2,0,Math.PI*2);c.fill();}c.restore();}
function badge(s,x,y){rect(x,y,114,35,18,mint);text(s,x+17,y+24,14,navy,true);}
function chrome(n,dark=false){text('WAVE',62,51,24,dark?navy:cream,true);text('TRAVEL AT YOUR PACE',926,47,13,dark?navy:cream);text('BRAND MOTION / CONCEPT',62,686,11,dark?'#435c5a':'#c0d1cd');text(`0${n} / 04`,1140,686,13,dark?navy:cream);}
function opening(t){rect(0,0,W,H,0,navy);waves(t);particles(t);const p=ease(t/1.5);c.save();c.beginPath();c.rect(650,86,566*p,550);c.clip();photo(pics[0],650,86,566,550,32);c.restore();
  c.save();c.globalAlpha=.45;c.strokeStyle=mint;c.lineWidth=2;c.beginPath();c.arc(686,389,260,t*.6,t*.6+4.3);c.stroke();c.restore();
  chrome(1);reveal('WAVE',66,310,133,t-.15);reveal('A wider world.',74,386,44,t-.6);text('More possibilities. Your own pace.',77,448,20,'#c1d7d0');
  c.save();c.globalAlpha=ease(t-1.3);badge('DISCOVER',76,516);c.restore();}
function discover(t){rect(0,0,W,H,0,cream);chrome(2,true);reveal('Find your kind of journey.',66,153,46,t,navy);text('Space to explore. Time to enjoy.',69,197,20,'#435c5a');
  for(let i=0;i<3;i++){let p=ease((t-i*.18)/1.1),x=68+i*390,y=245+(1-p)*340+Math.sin(t*1.25+i)*5;
    c.save();c.translate(x+177,y+165);c.rotate((1-p)*(.1-i*.08));c.globalAlpha=p;c.shadowColor='#092e3926';c.shadowBlur=22;c.shadowOffsetY=8;rect(-177,-165,354,342,22,'#fffdf7');c.shadowBlur=0;c.shadowOffsetY=0;photo(pics[i],-169,-157,338,261,17);text(['COAST','GARDEN','HARBOR'][i],-151,145,20,navy,true);text(`0${i+1}`,120,145,18,'#54736b');c.restore();}
  const pts=[];for(let j=0;j<160;j++)pts.push([80+j*7,626+12*Math.sin(j/22-t)]);line(pts,'#447c72',2,ease(t-.8));}
function route(t){rect(0,0,W,H,0,navy);chrome(3);waves(t,mint,.12,510);particles(t);
  reveal('Make room',67,270,61,t);reveal('for the journey.',67,345,61,t-.18);text('Discover. Plan. Go together.',72,406,21,'#c1d7d0');
  const pts=[];for(let i=0;i<=240;i++){let q=i/240;pts.push([665+490*q,488-170*Math.sin(q*Math.PI*1.4)-65*q]);}
  line(pts,'#2b5260',5);const p=ease(t/3.6);line(pts,mint,5,p);let tip=pts[Math.floor(p*240)];c.fillStyle=coral;c.beginPath();c.arc(...tip,9,0,7);c.fill();
  for(let i=0;i<3;i++){const q=i*.44+.03,node=pts[Math.floor(q*240)],a=ease(t-i*.6-.3);c.save();c.globalAlpha=a;let y=node[1]-150-25*(1-a);photo(pics[i],node[0]-70,y,140,112,15);rect(node[0]-70,y+88,140,30,0,cream);text(['DISCOVER','PLAN','GO'][i],node[0]-54,y+109,13,navy,true);c.fillStyle=cream;c.beginPath();c.arc(...node,6,0,7);c.fill();c.restore();}
}
function closing(t){cover(pics[2],0,0,W,H);rect(0,0,W,H,0,'#031f37b8');chrome(4);waves(t,mint,.35,581);
  reveal('TRAVEL',71,315,100,t-.1);reveal('TOGETHER.',71,429,100,t-.32);text('Every journey starts with a possibility.',78,496,21,'#e2e6df');
  const p=ease(t-.7);rect(76,532,530*p,5,3,mint);text('WAVE',977,586,43,cream,true);
}
const scenes=[opening,discover,route,closing];
function renderFilm(t){let idx=Math.min(3,Math.floor(t/5)),local=t-idx*5;scenes[idx](local);if(idx>0&&local<.6){let p=ease(local/.6);c.save();c.beginPath();c.rect(W*p,0,W*(1-p),H);c.clip();scenes[idx-1](5+local);c.restore();}rect(62,704,1156*(t/20),2,1,mint);}
function renderHero(t){const q=t/12*Math.PI*2;rect(0,0,W,H,0,navy);waves(q,mint,.35,490,true);particles(3*Math.sin(q));
  for(let i=0;i<3;i++){let x=660+i*154+24*Math.sin(q+i*1.5),y=150+i*36+22*Math.cos(q+i*.9);c.save();c.translate(x+130,y+170);c.rotate((i-1)*.12+.04*Math.sin(q));c.shadowColor='#00151e80';c.shadowBlur=28;c.shadowOffsetY=14;rect(-140,-190,280,380,25,cream);c.shadowBlur=0;c.shadowOffsetY=0;photo(pics[i],-133,-183,266,366,20);c.restore();}
  c.save();c.globalAlpha=.65;c.strokeStyle=mint;c.lineWidth=3;c.beginPath();c.ellipse(890,368,337,270,.12,q,q+4);c.stroke();c.restore();}
const mode=process.argv[2]??'film';const seconds=mode==='hero'?12:20;
const render=mode==='hero'?renderHero:renderFilm;
if(mode==='loop-check'){renderHero(0);const a=Buffer.from(canvas.data());renderHero(12);const b=canvas.data();let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);console.log(JSON.stringify({meanChannelDifference:sum/a.length}));process.exit(0);}
if(mode==='stills'){for(const t of [2,7,12,17]){renderFilm(t);writeFileSync(path.join(dir,`frame-${t}.png`),canvas.toBuffer('image/png'));}process.exit(0);}
const output=path.join(dir,mode==='hero'?'wave-hero-motion.mp4':'wave-intro-film.mp4');
const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<seconds*FPS;i++){render(i/FPS);if(!ff.stdin.write(canvas.data()))await once(ff.stdin,'drain');}
ff.stdin.end();const [code]=await once(ff,'close');if(code)throw Error(`FFmpeg ${code}`);console.log(output);
