'use client';
import type { ReactNode } from 'react';
import { PhotoPanorama } from '../features/landing/components/AwardPanorama';
import '../app/styles/award-panorama.css';
const sets = {
  community: ['community', 'coast', 'garden'],
  festival: ['festival', 'garden', 'coast'],
};
const photos = Object.fromEntries(Object.entries(sets).map(([kind, names]) => [kind, names.map(name => ({ id: name, image: `/media/night/${name}.webp`, title: '', address: '', source: '' }))]));
export default function NightScene({ kind, closing = false, children }: { kind: 'community' | 'festival'; closing?: boolean; children: ReactNode }) {
  return <div className={`night-photo-scene ${closing ? 'night-photo-footer' : 'night-photo-opening'}`}>
    <PhotoPanorama photos={photos[kind]} closing={closing} credit={false} />
    {children}
  </div>;
}
