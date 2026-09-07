// Original WAVE explanatory motion. Illustrative layout, not live route data.
export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
export function drawJourney(ctx, progress, { font = 'sans-serif', images = [] } = {}) {
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
