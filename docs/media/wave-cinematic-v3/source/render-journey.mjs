// Node + @napi-rs/canvas + FFmpeg. No model API or product dependencies.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {drawJourney} from './journey-scene.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const font=process.env.WAVE_FONT_PATH;
if(!font||!fs.existsSync(font))throw new Error('Set WAVE_FONT_PATH to a licensed Korean TTF font. No font is downloaded automatically.');
GlobalFonts.registerFromPath(font,'WaveKorean');
const images=await Promise.all(['hero-coast','garden-discovery','harbor-closing'].map(x=>loadImage(path.join(root,'images',`${x}.webp`))));
const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');
const out=path.join(root,'video/journey-sequence.mp4');
const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s','1280x720','-r','24','-i','-','-an','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',out]);
ff.stderr.pipe(process.stderr);const done=once(ff,'close');
for(let i=0;i<288;i++){
  // One continuous reveal with a final hold; replay is user controlled.
  drawJourney(ctx,Math.min(1,i/216),{font:'WaveKorean',images});
  if(i===287)fs.writeFileSync(path.join(root,'images/journey-poster.webp'),await canvas.encode('webp',88));
  if(!ff.stdin.write(Buffer.from(ctx.getImageData(0,0,1280,720).data)))await once(ff.stdin,'drain');
}
ff.stdin.end();if((await done)[0]!==0)throw new Error('FFmpeg failed');
console.log('Wrote journey-sequence.mp4');
