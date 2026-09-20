import type { CSSProperties } from 'react';

const paths: Record<string, string> = {
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  chat: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 8h8M8 12h5',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  edit: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5ZM3 23h18',
  bookmark: 'M6 21V4h12v17l-6-4Z',
  people: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 3a4 4 0 0 1 0 8M22 21v-3a4 4 0 0 0-3-4',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 11l3 3 5-6',
  calendar: 'M4 5h16v17H4ZM4 10h16M8 2v6M16 2v6M8 14h3M14 14h2M8 18h3',
  map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3ZM8 2v17M16 5v17',
  access: 'M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM11 8v7h7l3 6M11 11h7M8 11a6 6 0 1 0 7 9',
  bus: 'M5 3h14v15H5ZM5 10h14M8 18v3M16 18v3M8 14h1M15 14h1',
  bed: 'M2 20V6M2 15h20v5M5 9h5v6M10 11h9a3 3 0 0 1 3 3v1',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  list: 'M3 5h2M9 5h12M3 12h2M9 12h12M3 19h2M9 19h12',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3',
  check: 'm5 12 4 4L20 5',
};
export default function NightIcon({ name, size = 22, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] || paths.star}/></svg>;
}
