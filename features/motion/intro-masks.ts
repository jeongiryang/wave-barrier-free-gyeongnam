export function createIntroMasks({
  mode,
  wordmark,
  cols,
  rows,
  cellW,
  cellH,
}: {
  mode: "intro" | "ambient";
  wordmark: string;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
}) {
  if (mode !== "intro") return [];
  const offscreen = document.createElement("canvas");
  offscreen.width = cols;
  offscreen.height = rows;
  const context = offscreen.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  // 문자 셀의 세로·가로 비율을 보정해 형상이 화면에서 눌리지 않게 한다.
  const stretch = cellH / cellW;
  const viewW = cols / stretch;
  const centerX = viewW / 2;
  const centerY = rows / 2;

  const rasterize = (paint: (target: CanvasRenderingContext2D) => void) => {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, cols, rows);
    context.setTransform(stretch, 0, 0, 1, 0, 0);
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    context.lineCap = "round";
    context.lineJoin = "round";
    paint(context);
    context.setTransform(1, 0, 0, 1, 0, 0);
    const { data } = context.getImageData(0, 0, cols, rows);
    const output = new Float32Array(cols * rows);
    for (let index = 0; index < output.length; index += 1) output[index] = data[index * 4 + 3] / 255;
    return output;
  };

  const span = Math.min(rows * 0.42, viewW * 0.32);
  const unit = span / 100;
  const ux = (value: number) => centerX + value * unit;
  const uy = (value: number) => centerY - 4 * unit + value * unit;

  const routeMask = rasterize(target => {
    target.lineWidth = 8 * unit;
    target.beginPath(); target.moveTo(ux(-62),uy(40));
    target.bezierCurveTo(ux(-35),uy(-30),ux(15),uy(65),ux(58),uy(-36)); target.stroke();
    for (const [x,y] of [[-62,40],[0,18],[58,-36]]) {
      target.beginPath(); target.arc(ux(x),uy(y),12*unit,0,Math.PI*2); target.fill();
    }
  });
  const festivalMask = rasterize(target => {
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8;
      target.lineWidth=(i%2?5:7)*unit;
      target.beginPath(); target.moveTo(ux(Math.cos(angle)*28),uy(Math.sin(angle)*28));
      target.lineTo(ux(Math.cos(angle)*65),uy(Math.sin(angle)*65)); target.stroke();
      target.beginPath();target.arc(ux(Math.cos(angle)*80),uy(Math.sin(angle)*80),3*unit,0,Math.PI*2);target.fill();
    }
  });
  const communityMask = rasterize(target => {
    target.lineWidth=7*unit;
    target.beginPath();target.roundRect(ux(-70),uy(-50),120*unit,80*unit,15*unit);target.stroke();
    target.beginPath();target.moveTo(ux(-40),uy(30));target.lineTo(ux(-52),uy(52));target.lineTo(ux(-12),uy(30));target.stroke();
    for(const x of [-38,-10,18]){target.beginPath();target.arc(ux(x),uy(-10),6*unit,0,Math.PI*2);target.fill();}
  });

  const wordMask = rasterize((target) => {
    if (!wordmark) return;
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.font = "900 100px system-ui, sans-serif";
    const measured = target.measureText(wordmark).width / 100;
    const widthFit = measured > 0 ? (viewW * 0.68) / measured : rows * 0.3;
    const size = Math.max(6, Math.min(widthFit, rows * 0.3));
    target.font = `900 ${size}px system-ui, sans-serif`;
    target.fillText(wordmark, centerX, centerY);
  });

  return [routeMask, festivalMask, communityMask, wordMask];
}
