"use client";
import { useMemo } from 'react';
import { PhotoPanorama, useAwardPhotos } from '../features/landing/components/AwardPanorama';

const scenes = {
  home: ['coast', 'garden', 'community'],
  community: ['community', 'coast', 'garden'],
  festival: ['festival', 'garden', 'coast'],
  planner: ['planner'],
};
const fallbacks = Object.fromEntries(Object.entries(scenes).map(([kind, names]) => [kind, names.map(name => ({
  id: name, title: '', address: '', source: '', image: name === 'planner' ? '/naru/night-journey-scene.webp' : `/media/night/${name}.webp`,
}))]));

export default function ScenicBackground({ kind }: { kind: 'home' | 'planner' | 'community' | 'festival' }) {
  const awards = useAwardPhotos();
  const photos = useMemo(() => kind === 'home' && awards.length ? awards : fallbacks[kind], [kind, awards]);
  return <div className={`scenic-background scenic-background-${kind}`} aria-hidden="true">
    <PhotoPanorama photos={photos} credit={false} intervalMs={6000} />
  </div>;
}
