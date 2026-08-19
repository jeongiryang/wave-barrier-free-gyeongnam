"use client";

/**
 * 문자 하프톤으로 그리는 파도 필드.
 *
 * 수면 높이는 서로 다른 방향·파장을 가진 진행파의 합으로 만들고, 마루가 임계값을
 * 넘는 구간에 흐르는 난류를 더해 부서지는 물마루(whitewater)를 표현한다.
 * 포인터는 수면을 밀어 올리는 융기와 퍼져 나가는 물결을 함께 만든다.
 *
 * 인트로 모드에서는 물결 위로 세 개의 형상이 차례로 떠오른다.
 * 파도 → 무장애 심볼 → W.A.V.E 워드마크. 서비스가 무엇을 위한 것인지를
 * 문장 없이 형상만으로 먼저 보여 주기 위한 순서다.
 *
 * 화면을 채우는 셀은 2만 개가 넘어 셀마다 캔버스 명령을 부르면 호출 부담만으로
 * 프레임이 무너진다(측정: drawImage 방식 55ms/프레임). 그래서 밝기 단계별 문자를
 * 배경까지 합성한 픽셀 배열로 미리 만들어 두고, 프레임마다 그것을 프레임 버퍼에
 * 복사한 뒤 putImageData를 한 번만 호출한다(6.4ms/프레임).
 */

import { useEffect, useRef } from "react";
import { createIntroMasks } from "./intro-masks";
import {
  fastSin,
  INTRO_STAGES,
  stageWeight,
  WAVES,
  WAVE_RAMP,
  wavePalette,
  type Ripple,
} from "./wave-model";

interface WaveFieldRendererOptions {
  tone: "deep" | "light";
  mode: "intro" | "ambient";
  wordmark: string;
  motion: "full" | "calm";
};

export function useWaveFieldRenderer({ tone, mode, wordmark, motion }: WaveFieldRendererOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });
  const ripplesRef = useRef<Ripple[]>([]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    // 중첩 콜백에서도 null이 아닌 캔버스로 유지되도록 명시적으로 좁힌다.
    const canvas: HTMLCanvasElement = canvasElement;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reduced = motion === "calm" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { tints, background } = wavePalette(tone);

    let cols = 0, rows = 0, cellW = 0, cellH = 0, dpr = 1;
    let deviceW = 0, deviceH = 0;
    /* 셀마다 drawImage를 부르면 호출 부담만으로 프레임이 무너진다. 문자 스프라이트를
       픽셀 배열로 들고 있다가 프레임 버퍼에 직접 복사하고, 캔버스에는 프레임당
       putImageData 한 번만 넘긴다. */
    let glyphs: Uint32Array[] = [];
    let frameBuffer = new Uint32Array(0);
    let framePixels: ImageData | null = null;
    let backgroundPixel = 0;
    let masks: Float32Array[] = [];
    /** 파동별로 열·행 기여분을 미리 곱해 두면 셀 루프에서 덧셈과 sin만 남는다. */
    let colPhase: Float32Array[] = [];
    let rowPhase: Float32Array[] = [];
    let cellNoise: Float32Array = new Float32Array(0);
    let cellOrder: Float32Array = new Float32Array(0);
    let cellXs: Float32Array = new Float32Array(0);
    let cellYs: Float32Array = new Float32Array(0);
    let frame = 0;
    let inViewport = true;
    let start = 0;

    /** 밝기 단계마다 문자 한 칸을 배경 위에 미리 합성해 불투명 픽셀 배열로 만든다.
        미리 합성해 두면 프레임에서는 알파 합성 없이 그대로 복사만 하면 된다. */
    function buildGlyphs() {
      const cell = document.createElement("canvas");
      cell.width = cellW;
      cell.height = cellH;
      const cellContext = cell.getContext("2d", { willReadFrequently: true });
      if (!cellContext) return;

      glyphs = WAVE_RAMP.map((char, level) => {
        cellContext.fillStyle = background;
        cellContext.fillRect(0, 0, cellW, cellH);
        if (char.trim()) {
          cellContext.font = `700 ${cellH}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
          cellContext.fillStyle = tints[level];
          cellContext.textAlign = "center";
          cellContext.textBaseline = "middle";
          cellContext.fillText(char, cellW / 2, cellH / 2);
        }
        return new Uint32Array(cellContext.getImageData(0, 0, cellW, cellH).data.buffer.slice(0));
      });
      // 배경 픽셀 값은 같은 경로로 뽑아 바이트 순서를 신경 쓰지 않는다.
      backgroundPixel = glyphs[0][0];
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      // 격자가 성기면 형상의 사선이 계단으로 뭉개진다. 촘촘하게 시작하되,
      // 넓은 화면에서 셀 수가 폭발하지 않도록 총량 상한에 걸리면 글자를 키운다.
      // 셀 수는 CSS 크기로 정하므로 화면 배율이 올라가도 계산량은 그대로다.
      // 인트로는 형상의 곡선을 살려야 하므로 더 촘촘하게 간다. 배경으로 깔리는
      // 물결은 그만큼 촘촘할 필요가 없어 계산을 아낀다.
      const budget = mode === "intro" ? 34000 : 23000;
      let fontSize = mode === "intro" ? 8 : 10;
      for (let guard = 0; guard < 14; guard += 1) {
        const testW = Math.max(4, Math.round(fontSize * 0.6));
        const testH = Math.max(6, Math.round(fontSize));
        if (Math.ceil(width / testW) * Math.ceil(height / testH) <= budget) break;
        fontSize += 1;
      }
      // 셀과 스프라이트는 기기 픽셀 단위로 두어 고배율 화면에서도 문자가 또렷하다.
      cellW = Math.max(4, Math.round(fontSize * 0.6 * dpr));
      cellH = Math.max(6, Math.round(fontSize * dpr));

      deviceW = Math.round(width * dpr);
      deviceH = Math.round(height * dpr);
      cols = Math.ceil(deviceW / cellW);
      rows = Math.ceil(deviceH / cellH);

      canvas.width = deviceW;
      canvas.height = deviceH;
      context!.setTransform(1, 0, 0, 1, 0, 0);

      frameBuffer = new Uint32Array(deviceW * deviceH);
      framePixels = new ImageData(new Uint8ClampedArray(frameBuffer.buffer), deviceW, deviceH);

      buildGlyphs();
      masks = createIntroMasks({ mode, wordmark, cols, rows, cellW, cellH });

      // 물리 계산은 배율과 무관한 CSS 픽셀 좌표에서 한다.
      cellXs = new Float32Array(cols);
      for (let col = 0; col < cols; col += 1) cellXs[col] = (col * cellW) / dpr;
      cellYs = new Float32Array(rows);
      for (let row = 0; row < rows; row += 1) cellYs[row] = (row * cellH) / dpr;

      colPhase = WAVES.map((wave) => {
        const values = new Float32Array(cols);
        for (let col = 0; col < cols; col += 1) values[col] = cellXs[col] * 0.1 * wave.k * wave.dirX;
        return values;
      });
      rowPhase = WAVES.map((wave) => {
        const values = new Float32Array(rows);
        for (let row = 0; row < rows; row += 1) values[row] = cellYs[row] * 0.1 * wave.k * wave.dirY;
        return values;
      });

      cellNoise = new Float32Array(cols * rows);
      cellOrder = new Float32Array(cols * rows);
      for (let i = 0; i < cellNoise.length; i += 1) {
        // 규칙적인 격자 티를 지우는 결정적 의사난수.
        const n = Math.sin(i * 12.9898) * 43758.5453;
        const random = n - Math.floor(n);
        cellNoise[i] = random - 0.5;
        // 문자가 흩뿌려지듯 차오르는 순서. 첫 형상 안쪽이 먼저 차올라
        // 흩어진 점들이 모여 파도가 되는 것처럼 보이게 한다.
        cellOrder[i] = Math.max(0, random - (masks.length ? masks[0][i] * 0.42 : 0));
      }
    }

    function draw(now: number) {
      frame = 0;
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      const time = reduced ? 6 : elapsed;

      frameBuffer.fill(backgroundPixel);

      // 인트로 5초: 문자가 흩뿌려져 차오르고, 파도 → 무장애 심볼 → 워드마크가
      // 차례로 물 위에 맺혔다가 다시 잠긴다.
      let materialize = 1;
      let shapeW0 = 0, shapeW1 = 0, shapeW2 = 0;
      if (mode === "intro" && masks.length) {
        if (reduced) {
          shapeW1 = 1;
        } else {
          materialize = Math.min(1, Math.max(0, (elapsed - 0.25) / 1.15));
          shapeW0 = stageWeight(elapsed, INTRO_STAGES[0]);
          shapeW1 = stageWeight(elapsed, INTRO_STAGES[1]);
          shapeW2 = stageWeight(elapsed, INTRO_STAGES[2]);
        }
      }
      const reveal = Math.min(1, shapeW0 + shapeW1 + shapeW2);
      const mask0 = shapeW0 > 0.002 ? masks[0] : null;
      const mask1 = shapeW1 > 0.002 ? masks[1] : null;
      const mask2 = shapeW2 > 0.002 ? masks[2] : null;

      const ripples = ripplesRef.current;
      const pointer = pointerRef.current;
      const [w0, w1, w2, w3] = WAVES;
      const p0 = w0.phase + time * w0.speed, p1 = w1.phase + time * w1.speed;
      const p2 = w2.phase + time * w2.speed, p3 = w3.phase + time * w3.speed;
      const c0 = colPhase[0], c1 = colPhase[1], c2 = colPhase[2], c3 = colPhase[3];
      const rippleCount = ripples.length;

      for (let row = 0; row < rows; row += 1) {
        const y = cellYs[row];
        const deviceY = row * cellH;
        // 행에만 의존하는 값은 열 루프 밖으로 꺼낸다.
        const r0 = rowPhase[0][row] - p0, r1 = rowPhase[1][row] - p1;
        const r2 = rowPhase[2][row] - p2, r3 = rowPhase[3][row] - p3;
        const churnRow = fastSin(y * 0.31 + time * 1.3) * 2.2 - time * 3.8;
        const rowOffset = row * cols;

        for (let col = 0; col < cols; col += 1) {
          const index = rowOffset + col;
          // 아직 차오를 차례가 오지 않은 칸은 비워 둔다.
          if (materialize < 1 && cellOrder[index] > materialize) continue;

          const x = cellXs[col];

          // 1. 너울 — 진행파의 합
          let height = (w0.amp * fastSin(c0[col] + r0) + w1.amp * fastSin(c1[col] + r1)
            + w2.amp * fastSin(c2[col] + r2) + w3.amp * fastSin(c3[col] + r3)) / 2.22;

          // 2. 포인터 융기 — 커서가 수면을 밀어 올린다
          if (pointer.active) {
            const dx = x - pointer.x, dy = (y - pointer.y) * 1.6;
            const d2 = dx * dx + dy * dy;
            if (d2 < 62500) height += 0.85 * Math.exp(-d2 / 9000);
          }

          // 3. 포인터가 남긴 물결 — 퍼져 나가며 잦아든다
          for (let i = 0; i < rippleCount; i += 1) {
            const ripple = ripples[i];
            const dx = x - ripple.x, dy = (y - ripple.y) * 1.6;
            const d2 = dx * dx + dy * dy;
            const age = time - ripple.born;
            const front = age * 240;
            const outer = front + 130;
            // 물결 띠 밖은 제곱 거리로 먼저 걸러 sqrt를 피한다.
            if (d2 > outer * outer) continue;
            const inner = front - 190;
            if (inner > 0 && d2 < inner * inner) continue;
            const dist = Math.sqrt(d2);
            height += 0.95 * fastSin(dist * 0.055 - age * 6) * Math.exp(-dist / 260) * Math.exp(-age * 1.4);
          }

          // 4. 부서지는 물마루 — 마루가 임계값을 넘으면 흐르는 난류가 얹힌다
          if (height > 0.34) {
            const crest = (height - 0.34) / 0.66;
            height += crest * crest * fastSin(x * 0.42 + churnRow) * 0.34;
          }

          // 마루 쪽으로 밝기를 몰아 물마루가 가늘고 선명하게 서게 만든다.
          let value = (height + 1) / 2;
          value = value * value * (3 - 2 * value);
          value += cellNoise[index] * 0.07;

          if (reveal > 0) {
            let inside = 0;
            if (mask0) inside += mask0[index] * shapeW0;
            if (mask1) inside += mask1[index] * shapeW1;
            if (mask2) inside += mask2[index] * shapeW2;
            if (inside > 1) inside = 1;
            // 형상 안쪽은 포말까지 끌어올리고 바깥 바다는 가라앉힌다.
            // 형상에도 물결 성분을 조금 남겨 그려진 그림이 아니라 물마루로 보이게 한다.
            if (inside > 0) value = value * (1 - inside) + (0.9 + value * 0.1) * inside;
            value *= 1 - reveal * 0.5 * (1 - inside);
          }

          let level = (value * (WAVE_RAMP.length - 1) + 0.5) | 0;
          if (level < 0) level = 0;
          else if (level > WAVE_RAMP.length - 1) level = WAVE_RAMP.length - 1;
          if (!level) continue;

          // 배경은 이미 칠해져 있으므로 문자 칸만 프레임 버퍼에 덮어쓴다.
          const glyph = glyphs[level];
          const spanW = col === cols - 1 ? deviceW - col * cellW : cellW;
          const spanH = row === rows - 1 ? deviceH - deviceY : cellH;
          for (let py = 0; py < spanH; py += 1) {
            const source = py * cellW;
            const destination = (deviceY + py) * deviceW + col * cellW;
            for (let px = 0; px < spanW; px += 1) frameBuffer[destination + px] = glyph[source + px];
          }
        }
      }

      if (framePixels) context!.putImageData(framePixels, 0, 0);

      // 오래된 물결은 버린다.
      if (ripples.length) ripplesRef.current = ripples.filter((ripple) => time - ripple.born < 2.6);

      if (!reduced && inViewport && !document.hidden) frame = window.requestAnimationFrame(draw);
    }

    resize();
    const syncAnimation = () => {
      if (reduced) return;
      const shouldRun = !reduced && inViewport && !document.hidden;
      if (shouldRun && !frame) frame = window.requestAnimationFrame(draw);
      if (!shouldRun && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    if (reduced) frame = window.requestAnimationFrame(draw);
    else syncAnimation();

    const observer = new ResizeObserver(() => resize());
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? true;
      syncAnimation();
    });
    visibilityObserver.observe(canvas);
    document.addEventListener("visibilitychange", syncAnimation);

    let lastRipple = 0;
    function onPointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointerRef.current = { x, y, active: true };
      const time = (performance.now() - start) / 1000;
      // 물결을 너무 자주 만들면 화면이 뭉개지고 계산도 무거워진다.
      if (time - lastRipple > 0.16 && ripplesRef.current.length < 6) {
        lastRipple = time;
        ripplesRef.current.push({ x, y, born: time });
      }
    }
    function onPointerLeave() { pointerRef.current = { x: -9999, y: -9999, active: false }; }
    function onPointerDown(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      ripplesRef.current.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, born: (performance.now() - start) / 1000 });
    }

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [mode, tone, wordmark, motion]);

  return canvasRef;
}
