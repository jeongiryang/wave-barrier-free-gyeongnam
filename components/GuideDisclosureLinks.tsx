'use client';
import { useEffect } from 'react';

export default function GuideDisclosureLinks() {
  useEffect(() => {
    const reveal = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const section = document.getElementById(id);
      const details = section?.querySelector('details');
      if (details) { details.open = true; section?.scrollIntoView({ block: 'start' }); }
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  return null;
}
