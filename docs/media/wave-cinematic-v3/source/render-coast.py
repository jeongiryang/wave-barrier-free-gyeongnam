"""Animate only the safe open-water area of the generated WAVE coast image.

This is photo-based displacement animation, not filmed or video-model footage.
Camera, land, promenade and sky stay fixed. No third-party footage is used.
Python + numpy + scipy + Pillow + FFmpeg. A reproducible 8 s mathematical loop.
"""
from pathlib import Path
import subprocess, math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

ROOT=Path(__file__).resolve().parents[1]
W,H,FPS,SECONDS=1280,720,24,8
base=np.asarray(Image.open(ROOT/'images/hero-coast.webp').convert('RGB').resize((W,H),Image.Resampling.LANCZOS),dtype='float32')
y,x=np.mgrid[0:H,0:W].astype('float32'); xn=x/W;yn=y/H
def smooth(a):
    a=np.clip(a,0,1);return a*a*(3-2*a)
# Mask stays away from the headland and the distant islands.
mask=smooth((yn-.34)/.16)*smooth((.66-xn)/.16)
def frame(t):
    phase=math.tau*t/SECONDS
    dx=mask*(2.8*np.sin(yn*65+xn*18-phase)+1.2*np.sin(yn*146-xn*31-2*phase))
    dy=mask*(1.5*np.sin(xn*41+yn*35-phase)+.6*np.sin(yn*119+xn*62-3*phase))
    coords=np.array([np.clip(y+dy,0,H-1),np.clip(x+dx,0,W-1)])
    rgb=np.stack([map_coordinates(base[:,:,c],coords,order=1,mode='nearest',prefilter=False) for c in range(3)],axis=-1)
    shimmer=1+mask*.024*np.sin(yn*125+xn*29-2*phase)
    return np.clip(rgb*shimmer[:,:,None],0,255).astype('uint8')
if __name__=='__main__':
    out=ROOT/'video/hero-water-loop.mp4'
    proc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
    for i in range(FPS*SECONDS):
        proc.stdin.write(frame(i/FPS).tobytes())
        if i%48==0: print(f'{i}/{FPS*SECONDS}',flush=True)
    proc.stdin.close()
    if proc.wait():raise SystemExit('FFmpeg failed')
    print(f'Wrote {out.name}: {out.stat().st_size} bytes')
