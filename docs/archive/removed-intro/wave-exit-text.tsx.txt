"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toSceneTime } from "./wave-timing";

const vertex = /* glsl */ `
  attribute vec3 aScatter;
  attribute float aSeed;
  uniform float uTime;
  uniform vec2 uExtent;
  uniform float uPixelRatio;
  uniform float uMotion;
  varying float vOpacity;
  float ease(float t) { t=clamp(t,0.,1.); return t*t*t*(t*(t*6.-15.)+10.); }
  void main() {
    float t=clamp((uTime-9.15)/.85,0.,1.);
    float f=ease((t-fract(aSeed*53.)*.065)/.935);
    float z=mix(-5.,2.4,(aScatter.z+1.)*.5);
    vec3 end=vec3(aScatter.xy*uExtent*(5.-z)/5.,z);
    vec3 p=mix(position,end,f*uMotion);
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=(1.5+f*pow(aSeed,12.)*3.)*uPixelRatio*5./max(1.8,-mv.z);
    vOpacity=ease((uTime-9.15)/.04)*(1.-ease((uTime-9.65)/.35));
  }
`;
const fragment = /* glsl */ `
  precision highp float;
  varying float vOpacity;
  void main() {
    float d=length(gl_PointCoord-.5);
    float a=1.-smoothstep(.1,.5,d);
    gl_FragColor=vec4(.72,.92,1.,a*vOpacity*.8);
  }
`;

/** Samples the actual caption's typeface, tracking and screen rect; no word swap. */
export function SubtitleDissolve({timelineRef, reducedMotion}: {
  timelineRef: MutableRefObject<number>; reducedMotion: boolean;
}) {
  const {size, viewport} = useThree();
  const material = useRef<THREE.ShaderMaterial>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const uniforms = useMemo(() => ({
    uTime:{value:0}, uExtent:{value:new THREE.Vector2()}, uPixelRatio:{value:1}, uMotion:{value:1},
  }), []);

  useEffect(() => {
    let active = true;
    let built: THREE.BufferGeometry | undefined;
    document.fonts.ready.then(() => {
      if(!active) return;
      const element = document.querySelector<HTMLElement>('.wave-intro__subtitle');
      if(!element) return;
      const style = getComputedStyle(element);
      // OffsetTop/line box are layout coordinates, unaffected by entrance transforms.
      const anchor = element.parentElement!.getBoundingClientRect();
      const width = element.offsetWidth, height = element.offsetHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width*2); canvas.height = Math.ceil(height*2);
      const ctx = canvas.getContext('2d', {willReadFrequently:true});
      if(!ctx) return;
      ctx.font = `${style.fontWeight} ${parseFloat(style.fontSize)*2}px ${style.fontFamily}`;
      ctx.letterSpacing = `${(parseFloat(style.letterSpacing)||0)*2}px`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      const text = element.textContent!.trim();
      const metrics = ctx.measureText(text);
      const baseline = (canvas.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent)/2;
      ctx.fillText(text, canvas.width/2, baseline);
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const candidates:number[] = [];
      for(let i=0;i<canvas.width*canvas.height;i++) if(pixels[i*4+3]>100) candidates.push(i);
      if(!candidates.length) return;
      let seed = 83917;
      const random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
      const count = size.width<768 ? 22_000 : 40_000;
      const positions = new Float32Array(count*3), scatter = new Float32Array(count*3), seeds = new Float32Array(count);
      for(let i=0;i<count;i++) {
        const pixel=candidates[Math.floor(random()*candidates.length)];
        const x=anchor.left+(pixel%canvas.width+random())/2;
        const y=anchor.top+(Math.floor(pixel/canvas.width)+random())/2;
        positions[i*3]=(x/size.width-.5)*viewport.width;
        positions[i*3+1]=(.5-y/size.height)*viewport.height;
        scatter[i*3]=random()*2-1; scatter[i*3+1]=random()*2-1; scatter[i*3+2]=random()*2-1;
        seeds[i]=random();
      }
      built=new THREE.BufferGeometry();
      built.setAttribute('position',new THREE.BufferAttribute(positions,3));
      built.setAttribute('aScatter',new THREE.BufferAttribute(scatter,3));
      built.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
      setGeometry(built);
    });
    return () => { active=false; built?.dispose(); };
  }, [size.width,size.height,viewport.width,viewport.height]);

  useFrame(({gl}) => {
    if(!material.current) return;
    material.current.uniforms.uTime.value=toSceneTime(timelineRef.current)/1000;
    material.current.uniforms.uExtent.value.set(viewport.width*1.15,viewport.height*1.15);
    material.current.uniforms.uPixelRatio.value=gl.getPixelRatio();
    material.current.uniforms.uMotion.value=reducedMotion ? .3 : 1;
  });
  if(!geometry) return null;
  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment}
      transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}
