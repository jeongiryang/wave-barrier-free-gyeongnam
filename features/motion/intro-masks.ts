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

  const waveMask = rasterize((target) => {
    target.lineWidth = 15 * unit;
    target.beginPath();
    target.moveTo(ux(-76), uy(44));
    target.bezierCurveTo(ux(-58), uy(-16), ux(-10), uy(-48), ux(30), uy(-30));
    target.bezierCurveTo(ux(64), uy(-15), ux(70), uy(24), ux(32), uy(32));
    target.bezierCurveTo(ux(8), uy(37), ux(-2), uy(14), ux(18), uy(2));
    target.stroke();
    target.lineWidth = 8 * unit;
    [[-64, 54, -18, 54], [-40, 68, 26, 68]].forEach(([x1, y1, x2, y2]) => {
      target.beginPath();
      target.moveTo(ux(x1), uy(y1));
      target.lineTo(ux(x2), uy(y2));
      target.stroke();
    });
  });

  const accessMask = rasterize((target) => {
    target.lineWidth = 7 * unit;
    target.beginPath();
    target.arc(ux(6), uy(28), 30 * unit, 0, Math.PI * 2);
    target.stroke();
    target.beginPath();
    target.arc(ux(-26), uy(-46), 11 * unit, 0, Math.PI * 2);
    target.fill();
    target.lineWidth = 10 * unit;
    target.beginPath();
    target.moveTo(ux(-24), uy(-38));
    target.lineTo(ux(-8), uy(-2));
    target.stroke();
    target.lineWidth = 8 * unit;
    target.beginPath();
    target.moveTo(ux(-19), uy(-23));
    target.lineTo(ux(11), uy(-13));
    target.stroke();
    target.lineWidth = 9 * unit;
    target.beginPath();
    target.moveTo(ux(-8), uy(-2));
    target.lineTo(ux(19), uy(2));
    target.lineTo(ux(13), uy(22));
    target.stroke();
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

  return [waveMask, accessMask, wordMask];
}
