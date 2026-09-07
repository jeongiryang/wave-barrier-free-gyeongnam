"""WAVE original procedural ocean film. No image/video/API inputs.

Python 3 + numpy + FFmpeg. Deterministic 8 s seamless mathematical cycle.
Usage: python source/render-ocean.py [output.mp4]
This is a rendered concept ocean, not footage of a real destination.
"""
from pathlib import Path
import sys, subprocess, math
import numpy as np

W, H, FPS, SECONDS = 1280, 720, 24, 8
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'video/ocean-surface-loop.mp4'

def prepare():
    yy, xx = np.mgrid[0:H, 0:W].astype('float32')
    y = yy / H
    # Oblique view of a continuous water plane, no horizon or fake coastline.
    depth = 1.0 / (0.58 + y * 0.65)
    x = (xx / W - .5) * 10 * depth
    z = y * 10 * depth
    rng = np.random.default_rng(353)
    waves = []
    for i in range(22):
        angle = .85 + rng.uniform(-.8, .8)
        k = .95 * (1.29 ** i)
        amplitude = .12 * (.72 ** i)
        phase = (x * math.cos(angle) + z * math.sin(angle)) * k + rng.uniform(0, 6.283)
        harmonic = max(1, round(math.sqrt(k) * 1.8))
        waves.append((phase.astype('float32'), amplitude*k*math.cos(angle), amplitude*k*math.sin(angle), harmonic))
    return x, y, waves

X, Y, WAVES = prepare()

def frame(t):
    dx = np.zeros((H,W),dtype='float32'); dz = dx.copy()
    for phase, ax, az, harmonic in WAVES:
        v = np.cos(phase - (t / SECONDS) * math.tau * harmonic)
        dx += ax * v; dz += az * v
    inv = 1 / np.sqrt(dx*dx + dz*dz + 1)
    nx, ny, nz = -dx*inv, inv, -dz*inv
    # Fixed camera, animated normals. Reflect a soft sky and warm key light.
    vx = np.zeros_like(nx); vy = np.full_like(nx,.87); vz = np.full_like(nx,.493)
    ndv = np.clip(nx*vx + ny*vy + nz*vz,0,1)
    rx, ry, rz = 2*ndv*nx-vx, 2*ndv*ny-vy, 2*ndv*nz-vz
    fresnel = .05 + .68*(1-ndv)**3
    skylight = np.clip(ry*.62+.25,0,1)
    highlight = np.clip(rx*.28+ry*.86+rz*.426,0,1)
    sun = highlight**140 * .66 + highlight**18 * .1
    broad = .7+.3*np.sin(X*.32+Y*2)
    water = np.array([.008,.105,.143],dtype='float32')[None,None,:]*broad[:,:,None]
    sky = np.stack((.27+.22*skylight,.46+.17*skylight,.56+.16*skylight),axis=-1)
    rgb = water*(1-fresnel[:,:,None])+sky*fresnel[:,:,None]
    rgb += sun[:,:,None]*np.array([.95,.90,.77],dtype='float32')
    # Tonemapped highlights retain depth and avoid flickering pure white.
    rgb = np.maximum(rgb,0)**.65
    return (np.clip(rgb,0,1)*255).astype('uint8')

if __name__ == '__main__':
    OUT.parent.mkdir(parents=True,exist_ok=True)
    proc = subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT)],stdin=subprocess.PIPE)
    try:
        for i in range(FPS*SECONDS):
            proc.stdin.write(frame(i/FPS).tobytes())
            if i % 48 == 0: print(f'{i}/{FPS*SECONDS}',flush=True)
    finally:
        proc.stdin.close()
    if proc.wait(): raise SystemExit('FFmpeg failed')
    print(f'Wrote {OUT.name}: {OUT.stat().st_size} bytes',flush=True)
