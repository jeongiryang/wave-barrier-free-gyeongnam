/* eslint-disable react-hooks/immutability, react-hooks/preserve-manual-memoization, react-hooks/refs */
"use client";

import "./wave-intro.css";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import { ICON_PATHS, drawReferenceShape } from "./wave-shapes";
import { drawGyeongnam } from "./gyeongnam-boundary";
import { SubtitleDissolve } from "./wave-exit-text";
import { INTRO_DURATION_MS, INTRO_EXIT_START_MS, WAVE_FLOW_END_MS, BOUNDARY_FORMED_MS, BOUNDARY_HOLD_END_MS, toSceneTime, toPlaybackTime } from "./wave-timing";

export { INTRO_DURATION_MS, INTRO_EXIT_START_MS } from "./wave-timing";
export const INTRO_STAGE_TIMES = [0, WAVE_FLOW_END_MS, BOUNDARY_FORMED_MS, BOUNDARY_HOLD_END_MS, ...[769, 1_538, 2_308, 3_077, 3_846, 4_615, 5_385, 6_154, 6_923, 7_692, 8_846, 10_000].map(toPlaybackTime)];
export const INTRO_STAGE_COUNT = INTRO_STAGE_TIMES.length;

const WAVE_SUBTITLE_TIME_MS = 8_666;

const PARTICLE_COUNT_DESKTOP = 330_000;
const PARTICLE_COUNT_MOBILE = 144_000;
const MASK_SIZE = 1024;

type WaveIntroProps = {
  onComplete?: () => void;
  /** Mount/reveal the service page beneath this transparent overlay. */
  onExitStart?: () => void;
  className?: string;
  paused?: boolean;
  seek?: { sequence: number; timeMs: number };
  onTime?: (timeMs: number) => void;
  onReady?: () => void;
};

type PointerState = {
  x: number;
  y: number;
  speed: number;
  sequence: number;
};

export function getIntroStage(timeMs: number) {
  const clamped = THREE.MathUtils.clamp(timeMs, 0, INTRO_DURATION_MS);
  for (let index = INTRO_STAGE_TIMES.length - 1; index >= 0; index -= 1) {
    if (clamped >= INTRO_STAGE_TIMES[index]) return index;
  }
  return 0;
}

function smoother(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function getStageState(timeMs: number) {
  const clampedTime = THREE.MathUtils.clamp(timeMs, 0, INTRO_DURATION_MS);
  if (clampedTime >= INTRO_DURATION_MS) return { stage: INTRO_STAGE_COUNT - 1, progress: 1, timeMs: INTRO_DURATION_MS };
  const stage = getIntroStage(clampedTime);
  const start = INTRO_STAGE_TIMES[stage];
  const end = INTRO_STAGE_TIMES[stage + 1] ?? INTRO_DURATION_MS;
  return { stage, progress: (clampedTime - start) / Math.max(1, end - start), timeMs: clampedTime };
}

function seededRandom(seed = 0x715e) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function setupMaskContext(canvas: HTMLCanvasElement) {
  canvas.width = MASK_SIZE;
  canvas.height = MASK_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.clearRect(0, 0, MASK_SIZE, MASK_SIZE);
  context.fillStyle = "white";
  context.strokeStyle = "white";
  context.lineCap = "round";
  context.lineJoin = "round";
  return context;
}

const DRAWERS = ICON_PATHS.map((_, index) => (context: CanvasRenderingContext2D) => drawReferenceShape(context, index, MASK_SIZE));

function makeMask(draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  const context = setupMaskContext(canvas);
  draw(context);
  return canvas;
}

function sampleMask(mask: HTMLCanvasElement, count: number, random: () => number) {
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable");
  const alpha = context.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
  const candidates: number[] = [];
  for (let y = 2; y < MASK_SIZE - 2; y += 2) {
    for (let x = 2; x < MASK_SIZE - 2; x += 2) {
      if (alpha[(y * MASK_SIZE + x) * 4 + 3] > 80) candidates.push(y * MASK_SIZE + x);
    }
  }
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const pixel = candidates[Math.floor(random() * candidates.length)] ?? 0;
    const x = pixel % MASK_SIZE;
    const y = Math.floor(pixel / MASK_SIZE);
    positions[index * 3] = (((x + random() * 1.6 - 0.8) / MASK_SIZE) * 2 - 1);
    positions[index * 3 + 1] = (1 - ((y + random() * 1.6 - 0.8) / MASK_SIZE) * 2);
    positions[index * 3 + 2] = (random() - 0.5) * 0.04;
  }
  return positions;
}

function makeScatter(count: number, random: () => number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    // A full volume, not a ring or a flat screen of particles.
    positions[index * 3] = random() * 2 - 1;
    positions[index * 3 + 1] = random() * 2 - 1;
    positions[index * 3 + 2] = random() * 2 - 1;
  }
  return positions;
}

function useSceneData(count: number) {
  return useMemo(() => {
    const random = seededRandom(0x0b1a2c3d);
    const masks = DRAWERS.map((drawer) => makeMask(drawer));
    const targets = masks.map((mask) => sampleMask(mask, count, random));
    const boundary = sampleMask(makeMask((context) => drawGyeongnam(context, MASK_SIZE)), count, random);
    const scatter = makeScatter(count, random);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      sizes[index] = 0.58 + random() * 1.15;
      seeds[index] = random();
    }
    return { targets, boundary, scatter, sizes, seeds };
  }, [count]);
}

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fluidSimulationFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrevious;
  uniform vec2 uTexel;
  uniform vec2 uPointer;
  uniform float uImpulse;
  void main() {
    vec2 state = texture2D(uPrevious, vUv).rg;
    float left = texture2D(uPrevious, vUv - vec2(uTexel.x, 0.0)).r;
    float right = texture2D(uPrevious, vUv + vec2(uTexel.x, 0.0)).r;
    float down = texture2D(uPrevious, vUv - vec2(0.0, uTexel.y)).r;
    float up = texture2D(uPrevious, vUv + vec2(0.0, uTexel.y)).r;
    float laplacian = left + right + down + up - 4.0 * state.r;
    float velocity = (state.g + laplacian * 0.43) * 0.982;
    float height = (state.r + velocity) * 0.996;
    float distanceToPointer = distance(vUv, uPointer);
    height += exp(-distanceToPointer * distanceToPointer * 1200.0) * uImpulse;
    gl_FragColor = vec4(height, velocity, 0.0, 1.0);
  }
`;

function useFluidHeight(pointerRef: MutableRefObject<PointerState>) {
  const { gl, size } = useThree();
  const resolution = size.width < 768 ? 256 : 512;
  const targets = useMemo(() => {
    const options: THREE.RenderTargetOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    return [new THREE.WebGLRenderTarget(resolution, resolution, options), new THREE.WebGLRenderTarget(resolution, resolution, options)];
  }, [resolution]);
  const current = useRef(0);
  const outputTexture = useRef(targets[0].texture);
  const lastSequence = useRef(0);
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: fluidSimulationFragment,
    uniforms: { uPrevious: { value: targets[0].texture }, uTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) }, uPointer: { value: new THREE.Vector2(-10, -10) }, uImpulse: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  }), [resolution, targets]);

  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);
    // A simulation starts at zero height/velocity, never the renderer's navy
    // clear colour (which otherwise creates a slowly decaying full-screen glow).
    const previousTarget = gl.getRenderTarget();
    const previousColor = gl.getClearColor(new THREE.Color());
    const previousAlpha = gl.getClearAlpha();
    gl.setClearColor(0x000000, 0);
    targets.forEach((target) => { gl.setRenderTarget(target); gl.clear(); });
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousColor, previousAlpha);
    current.current = 0;
    outputTexture.current = targets[0].texture;
    return () => {
      scene.remove(quad);
      quad.geometry.dispose();
      material.dispose();
      targets.forEach((target) => target.dispose());
    };
  }, [gl, material, scene, targets]);

  useFrame(() => {
    const read = targets[current.current];
    const write = targets[1 - current.current];
    const pointer = pointerRef.current;
    material.uniforms.uPrevious.value = read.texture;
    if (pointer.sequence !== lastSequence.current) {
      lastSequence.current = pointer.sequence;
      material.uniforms.uPointer.value.set(pointer.x, pointer.y);
      material.uniforms.uImpulse.value = Math.min(0.34, 0.045 + pointer.speed * 0.01);
    } else {
      material.uniforms.uPointer.value.set(-10, -10);
      material.uniforms.uImpulse.value = 0;
    }
    gl.setRenderTarget(write);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    current.current = 1 - current.current;
    outputTexture.current = write.texture;
  }, -2);
  return outputTexture;
}

const backgroundFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uFluid;

  uniform float uTime;
  uniform float uTimeline;
  uniform float uAspect;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }
  float mountain(vec2 uv, float offset, float scale) {
    float ridge = offset + sin(uv.x * 5.1 + 0.8) * 0.052 * scale + sin(uv.x * 11.7) * 0.028 * scale + noise(vec2(uv.x * 7.0, 2.0)) * 0.1 * scale;
    return smoothstep(ridge + 0.014, ridge - 0.014, uv.y);
  }
  float dropletLayer(vec2 p, float scale, float seed, float bandDistance, float density) {
    vec2 grid = p * scale;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float identity = hash(cell + seed);
    vec2 offset = vec2(hash(cell + seed + 17.13), hash(cell + seed + 43.71)) - 0.5;
    vec2 delta = local - offset * 0.62;
    float radius = mix(0.085, 0.23, hash(cell + seed + 9.7));
    float drop = 1.0 - smoothstep(radius, radius + 0.07, length(delta));
    float focus = exp(-bandDistance * mix(7.0, 15.0, identity));
    return drop * focus * step(1.0 - density, identity);
  }
  void main() {
    vec2 uv = vUv;
    float h = texture2D(uFluid, uv).r;
    float hx = texture2D(uFluid, uv + vec2(0.003, 0.0)).r - h;
    float hy = texture2D(uFluid, uv + vec2(0.0, 0.003)).r - h;
    vec2 distorted = uv + vec2(hx, hy) * 0.34;
    vec2 p = vec2((distorted.x - 0.5) * uAspect, distorted.y - 0.5);
    float flow = noise(vec2(p.x * 2.8 + uTime * 0.025, p.y * 6.0 - uTime * 0.02));
    float mainWave = sin(p.x * 5.4 - uTime * 0.38) * 0.112 + sin(p.x * 2.1 + uTime * 0.19) * 0.034;
    float echoWave = sin(p.x * 5.4 - uTime * 0.38 + 0.72) * 0.105 - 0.055;
    float mainDistance = abs(p.y - mainWave);
    float echoDistance = abs(p.y - echoWave);
    float core = exp(-mainDistance * 92.0) + exp(-echoDistance * 115.0) * 0.42;
    float halo = exp(-mainDistance * 16.0) + exp(-echoDistance * 23.0) * 0.34;
    float drops = dropletLayer(p + vec2(uTime * 0.008, 0.0), 74.0, 3.2, mainDistance, 0.62);
    drops += dropletLayer(p - vec2(uTime * 0.005, 0.0), 112.0, 19.6, min(mainDistance, echoDistance), 0.38) * 0.72;
    float distantDrops = dropletLayer(p, 58.0, 51.8, min(mainDistance + 0.055, echoDistance + 0.08), 0.16) * 0.32;
    float openingWave = mix(1.0, 0.14, smoothstep(${WAVE_FLOW_END_MS / 1000}, ${BOUNDARY_FORMED_MS / 1000}, uTime));
    vec3 color = mix(vec3(0.001, 0.013, 0.04), vec3(0.001, 0.012, 0.04), distorted.y);
    color += vec3(0.028, 0.22, 0.58) * flow * 0.12;
    color += vec3(0.08, 0.46, 1.0) * halo * 0.34 * openingWave;
    color += vec3(0.72, 0.94, 1.0) * core * 0.86 * openingWave;
    color += vec3(0.18, 0.69, 1.0) * (drops + distantDrops) * (0.42 + openingWave * 0.58);
    color += vec3(0.18, 0.64, 1.0) * abs(h) * 2.7;
    float burstEnvelope = (1.0 - smoothstep(0.7, 1.6, uTime)) * 0.65;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float rays = pow(noise(vec2(angle * 120.0, radius * 2.0 - uTime * 0.7)), 14.0) * exp(-radius * 2.0);
    float burstCore = exp(-radius * 80.0);
    color += vec3(0.22, 0.66, 1.0) * rays * burstEnvelope * 0.92;
    color += vec3(0.82, 0.97, 1.0) * burstCore * burstEnvelope * 2.1;
    float iconWindow = smoothstep(0.17, 0.23, uTimeline) * (1.0 - smoothstep(0.72, 0.79, uTimeline));
    float floorGlow = exp(-pow(p.x / 0.34, 2.0) - pow((p.y + 0.37) / 0.027, 2.0));
    color += vec3(0.05, 0.42, 1.0) * floorGlow * iconWindow * 0.72;
    float vignette = smoothstep(0.9, 0.2, distance(uv, vec2(0.5)));
    color *= 0.58 + vignette * 0.58;
    gl_FragColor = vec4(color, 1.0 - smoothstep(0.915, 1.0, uTimeline));
  }
`;

function DynamicBackground({ pointerRef, timelineRef }: { pointerRef: MutableRefObject<PointerState>; timelineRef: MutableRefObject<number> }) {
  const viewport = useThree((state) => state.viewport);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const fluidTexture = useFluidHeight(pointerRef);
  const uniforms = useMemo(() => ({ uFluid: { value: fluidTexture.current }, uTime: { value: 0 }, uTimeline: { value: 0 }, uAspect: { value: 1 } }), [fluidTexture]);
  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uFluid.value = fluidTexture.current;
    materialRef.current.uniforms.uTime.value = timelineRef.current / 1000;
    materialRef.current.uniforms.uTimeline.value = toSceneTime(timelineRef.current) / 10_000;
    materialRef.current.uniforms.uAspect.value = viewport.width / viewport.height;
  }, -1);
  return (
    <mesh scale={[viewport.width * 1.44, viewport.height * 1.44, 1]} position={[0, 0, -2]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={materialRef} vertexShader={fullscreenVertex} fragmentShader={backgroundFragment} uniforms={uniforms} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aScatter;
  attribute vec3 aBoundary;
  attribute vec3 aTarget0;
  attribute vec3 aTarget1;
  attribute vec3 aTarget2;
  attribute vec3 aTarget3;
  attribute vec3 aTarget4;
  uniform float uTime;
  uniform float uPlayback;
  uniform float uPixelRatio;
  uniform float uMotionScale;
  uniform vec2 uCloudExtent;
  uniform float uWorldScale;
  varying float vSeed;
  varying float vEnergy;
  varying float vFocus;
  float ease(float t) { return t*t*t*(t*(t*6.-15.)+10.); }
  void main() {
    float ms=uTime*1000.;
    vec3 from=aTarget0;
    vec3 to=aTarget0;
    float t=clamp((ms-769.)/1331.,0.,1.);
    float mode=0.;
    if(ms>=2500.){
      from=aTarget0;to=aTarget1;t=clamp((ms-2500.)/1100.,0.,1.);mode=1.;
    }
    if(ms>=4000.){
      from=aTarget1;to=aTarget2;t=clamp((ms-4000.)/1100.,0.,1.);mode=2.;
    }
    if(ms>=5550.){
      from=aTarget2;to=aTarget3;t=clamp((ms-5550.)/1120.,0.,1.);mode=3.;
    }
    if(ms>=7130.){
      from=aTarget3;to=aTarget4;t=clamp((ms-7130.)/1316.,0.,1.);mode=4.;
    }
    // Slightly stagger individual droplets, never crossfade two complete shapes.
    float departure=fract(aSeed*37.19)*.08;
    float arrival=.88+fract(aSeed*91.73)*.12;
    t=clamp((t-departure)/(arrival-departure),0.,1.);
    float e=ease(t);
    // Cloud depth is in world units: foreground +2.4, far field -5.0.
    // Perspective-compensated XY keeps the volume spread across every edge.
    float worldZ=mix(-5.,2.4,(aScatter.z+1.)*.5);
    vec2 q=aScatter.xy;
    float angle=0.;
    if(mode<.5) angle=(uPlayback*.13+t*.75)*uMotionScale;
    else if(mode<1.5) angle=sin(t*3.14159)*aScatter.z*.8;
    else if(mode<2.5) angle=t*2.7*uMotionScale;
    else if(mode<3.5) angle=sin(t*6.283+aSeed*6.283)*.7*uMotionScale;
    else angle=t*aScatter.z*1.3*uMotionScale;
    q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
    vec3 cloud=vec3(q*uCloudExtent*(5.-worldZ)/5.,worldZ/uWorldScale);
    float spread;
    vec3 p;
    if(mode<.5){
      if(uPlayback*1000.<${BOUNDARY_HOLD_END_MS}.0) {
        // The same dense cloud visible over the opening waves creates the map.
        // It stays fully assembled while the province caption can be read.
        float gathering=ease(clamp((uPlayback*1000.-${WAVE_FLOW_END_MS}.0)/${BOUNDARY_FORMED_MS-WAVE_FLOW_END_MS}.0,0.,1.));
        spread=1.-gathering;
        p=mix(cloud,aBoundary,gathering);
      } else if(ms<769.) {
        // Continuous handoff from the held map to the original icon sequence.
        float opening=ease(clamp(ms/769.,0.,1.));
        spread=opening;
        p=mix(aBoundary,cloud,opening);
      } else {
        spread=1.-e;
        p=mix(cloud,to,e);
      }
    }else{
      // Every transition traverses an all-direction 3D cloud on one continuous
      // curve. At midpoint the previous icon has completely lost its silhouette.
      spread=sin(t*3.14159265);
      p=mix(from,to,e)+cloud*spread*mix(.3,1.,uMotionScale);
    }
    if(ms>=9150.) {
      float exitTime=clamp((ms-9150.)/850.,0.,1.);
      float flight=ease(clamp((exitTime-fract(aSeed*53.)*.065)/.935,0.,1.));
      spread=flight;
      p=mix(aTarget4,cloud*1.85,flight);
    }
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;
    float large=pow(aSeed,45.);
    gl_PointSize=min(24.,(1.05+aSize*.65+spread*large*11.)*uPixelRatio*(5./max(1.8,-mv.z)));
    vSeed=aSeed;
    vEnergy=spread*.18;
    vFocus=spread*smoothstep(0.,2.4,worldZ)*.6;
  }
`;

const particleFragment = /* glsl */ `
  precision highp float;

  uniform float uOpacity;
  varying float vSeed;
  varying float vEnergy;
  varying float vFocus;
  void main() {
    float roundMask = smoothstep(0.5, 0.16, distance(gl_PointCoord, vec2(0.5)));
    vec2 q=(gl_PointCoord-.5)*2.;
    float r=length(q);
    float rim=exp(-pow((r-.73)*10.,2.));
    float shine=exp(-length((q-vec2(-.27,-.32))*vec2(6.,9.)));
    float alpha = (rim*.55+shine*.95+exp(-r*r*4.)*.14)*roundMask;
    vec3 color = vec3(.04,.3,.8)+vec3(.4,.67,.8)*rim+vec3(.9,1.,1.)*shine;
    color += vec3(0.12, 0.55, 1.0) * vEnergy;
    gl_FragColor = vec4(color, alpha * uOpacity * (1.0 - vFocus * .5));
  }
`;

function DropletMorphField({ timelineRef, reducedMotion }: { timelineRef: MutableRefObject<number>; reducedMotion: boolean }) {
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = size.width < 768 ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  const sceneData = useSceneData(count);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(sceneData.scatter, 3));
    result.setAttribute("aScatter", new THREE.BufferAttribute(sceneData.scatter, 3));
    result.setAttribute("aBoundary", new THREE.BufferAttribute(sceneData.boundary, 3));
    sceneData.targets.forEach((target, index) => result.setAttribute(`aTarget${index}`, new THREE.BufferAttribute(target, 3)));
    result.setAttribute("aSize", new THREE.BufferAttribute(sceneData.sizes, 1));
    result.setAttribute("aSeed", new THREE.BufferAttribute(sceneData.seeds, 1));
    return result;
  }, [sceneData]);
  const uniforms = useMemo(() => ({ uStage: { value: 0 }, uProgress: { value: 0 }, uTime: { value: 0 }, uPlayback: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 }, uMotionScale: { value: 1 }, uCloudExtent: { value: new THREE.Vector2(1, 1) }, uWorldScale: { value: 1 } }), []);
  useFrame(({ gl }) => {
    if (!materialRef.current) return;
    const state = getStageState(timelineRef.current);
    materialRef.current.uniforms.uStage.value = state.stage;
    materialRef.current.uniforms.uProgress.value = state.progress;
    materialRef.current.uniforms.uTime.value = toSceneTime(timelineRef.current) / 1000;
    materialRef.current.uniforms.uPlayback.value = timelineRef.current / 1000;
    materialRef.current.uniforms.uPixelRatio.value = Math.min(1.5, gl.getPixelRatio());
    materialRef.current.uniforms.uMotionScale.value = reducedMotion ? 0.2 : 1;
    materialRef.current.uniforms.uCloudExtent.value.set(viewport.width * 0.6 / scale, viewport.height * 0.6 / scale);
    materialRef.current.uniforms.uWorldScale.value = scale;
    materialRef.current.uniforms.uOpacity.value = 0.58 * (1-smoother((toSceneTime(timelineRef.current)-9_650)/350));

  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  const scale = Math.min(viewport.width * 0.44, viewport.height * 0.4);
  return (
    <points geometry={geometry} scale={[scale, scale, scale]} position={[0, 0.1, 0.1]} frustumCulled={false}>
      <shaderMaterial ref={materialRef} vertexShader={particleVertex} fragmentShader={particleFragment} uniforms={uniforms} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function Scene({ pointerRef, timelineRef, reducedMotion, onReady }: { pointerRef: MutableRefObject<PointerState>; timelineRef: MutableRefObject<number>; reducedMotion: boolean; onReady: () => void }) {
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  useEffect(() => {
    let active = true;
    document.fonts.ready.then(() => { if(active) readyRef.current(); });
    return () => { active = false; };
  }, []);
  return <><DynamicBackground pointerRef={pointerRef} timelineRef={timelineRef} /><DropletMorphField timelineRef={timelineRef} reducedMotion={reducedMotion} /><SubtitleDissolve timelineRef={timelineRef} reducedMotion={reducedMotion} /></>;
}

const ICON_CAPTIONS = [
  { start: 1_800, end: 2_500, text: "누구나 자유롭게," },
  { start: 3_300, end: 4_000, text: "언제든 편안하게," },
  { start: 4_800, end: 5_550, text: "더 멀리, 더 함께," },
  { start: 6_350, end: 7_130, text: "모든 순간, 함께하는 여행." },
] as const;

function CopyLayer({ timeMs: playbackMs, reducedMotion }: { timeMs: number; reducedMotion: boolean }) {
  const timeMs = toSceneTime(playbackMs);
  const boundaryCaption = smoother((playbackMs-BOUNDARY_FORMED_MS)/180) * (1-smoother((playbackMs-BOUNDARY_HOLD_END_MS)/180));
  const subtitle = smoother((timeMs - WAVE_SUBTITLE_TIME_MS) / 180) * (1-smoother((timeMs-9_150)/40));
  return (
    <div className="wave-intro__copy" aria-hidden="true">
      <p className="wave-intro__icon-caption" data-boundary-caption="true"
        style={{opacity:boundaryCaption, transform:reducedMotion ? "none" : `translateY(${(1-boundaryCaption)*6}px)`}}>
        경상남도에서 시작되는, 모두를 위한 여행
      </p>
      {ICON_CAPTIONS.map(({start, end, text}, index) => {
        const opacity = smoother((timeMs-start)/180) * (1-smoother((timeMs-end+120)/120));
        return <p key={text} className="wave-intro__icon-caption" data-icon-caption={index}
          style={{opacity, transform: reducedMotion ? "none" : `translateY(${(1-opacity)*6}px)`}}>{text}</p>;
      })}
      <div className="wave-intro__subtitle-anchor">
        <p className="wave-intro__subtitle" data-visible={subtitle > 0}
          style={{opacity: subtitle, transform: reducedMotion ? "none" : `translateY(${(1-subtitle)*6}px)`, filter: reducedMotion ? "none" : `blur(${(1-subtitle)*4}px)`, transition:"none"}}>
          모두의 발걸음이 닿는 경상남도
        </p>
      </div>
    </div>
  );
}

export function WaveIntro({ onComplete, onExitStart, className = "", paused = false, seek, onTime, onReady }: WaveIntroProps) {
  const timelineRef = useRef(0);
  const pointerRef = useRef<PointerState>({ x: 0.5, y: 0.5, speed: 0, sequence: 0 });
  const previousPointerRef = useRef({ x: 0.5, y: 0.5, time: 0 });
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onExitStartRef = useRef(onExitStart);
  const exitStartedRef = useRef(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const controls = useRef({ paused, onTime, onReady });
  controls.current = { paused, onTime, onReady };
  const [stageState, setStageState] = useState({ stage: 0, progress: 0, timeMs: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  onCompleteRef.current = onComplete;
  onExitStartRef.current = onExitStart;

  const startExit = useCallback(() => {
    if(exitStartedRef.current) return;
    exitStartedRef.current = true;
    onExitStartRef.current?.();
  }, []);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!seek) return;
    timelineRef.current = Math.max(0, Math.min(INTRO_EXIT_START_MS - 1, seek.timeMs));
    setStageState(getStageState(timelineRef.current));
    controls.current.onTime?.(timelineRef.current);
  }, [seek]);

  useEffect(() => {
    if (!canvasReady || !sceneReady) return;
    controls.current.onReady?.();
    let frame = 0;
    let lastTime = performance.now();
    let lastUiUpdate = -1;
    const resetClock = () => { lastTime = performance.now(); };
    const tick = (now: number) => {
      if (completedRef.current) return;
      const delta = document.hidden || controls.current.paused ? 0 : Math.max(0, now - lastTime);
      lastTime = now;
      const elapsed = Math.min(INTRO_DURATION_MS, timelineRef.current + delta);
      timelineRef.current = elapsed;
      controls.current.onTime?.(elapsed);
      if(elapsed >= INTRO_EXIT_START_MS) startExit();
      const current = getStageState(elapsed);
      const uiKey = Math.floor(elapsed);
      if (uiKey !== lastUiUpdate) {
        lastUiUpdate = uiKey;
        setStageState(current);
      }
      if (elapsed >= INTRO_DURATION_MS) {
        setStageState({ stage: INTRO_STAGE_COUNT - 1, progress: 1, timeMs: INTRO_DURATION_MS });
        complete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", resetClock);
    frame = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("visibilitychange", resetClock);
      cancelAnimationFrame(frame);
    };
  }, [canvasReady, sceneReady, complete, startExit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      timelineRef.current = INTRO_DURATION_MS;
      setStageState({ stage: INTRO_STAGE_COUNT - 1, progress: 1, timeMs: INTRO_DURATION_MS });
      startExit();
      complete();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [complete, startExit]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1);
    const now = performance.now();
    const previous = previousPointerRef.current;
    const elapsedSeconds = Math.max(0.016, (now - previous.time) / 1000);
    const speed = Math.hypot(x - previous.x, y - previous.y) / elapsedSeconds;
    pointerRef.current = { x, y, speed: THREE.MathUtils.clamp(speed, 0.2, 18), sequence: pointerRef.current.sequence + 1 };
    previousPointerRef.current = { x, y, time: now };
  };

  return (
    <section className={`wave-intro ${className}`.trim()} onPointerMove={handlePointerMove} aria-label={`WAVE ${(INTRO_DURATION_MS / 1000).toFixed(1)}초 인트로`} aria-hidden={isComplete} data-stage={stageState.stage} data-progress={stageState.progress.toFixed(3)} data-time-ms={Math.round(stageState.timeMs)} data-exiting={stageState.timeMs >= INTRO_EXIT_START_MS} data-complete={isComplete} tabIndex={-1}>
      <Canvas className="wave-intro__canvas" frameloop={paused ? "demand" : "always"} dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 20 }} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.setClearColor("#020817", 0); gl.outputColorSpace = THREE.SRGBColorSpace; setCanvasReady(true); }} fallback={<div className="wave-intro__static-fallback" />}>
        <Suspense fallback={null}><Scene pointerRef={pointerRef} timelineRef={timelineRef} reducedMotion={reducedMotion} onReady={() => setSceneReady(true)} /></Suspense>
      </Canvas>
      <CopyLayer timeMs={stageState.timeMs} reducedMotion={reducedMotion} />
      <div className="wave-intro__edge-glow" aria-hidden="true" style={{opacity:1-smoother((stageState.timeMs-INTRO_EXIT_START_MS)/(INTRO_DURATION_MS-INTRO_EXIT_START_MS))}} />
      <output className="sr-only" aria-live="polite" aria-atomic="true">{isComplete ? "WAVE 인트로가 완료되었습니다." : "WAVE 인트로 재생 중"}</output>
    </section>
  );
}
