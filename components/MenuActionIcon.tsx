import type { SVGProps } from 'react';
const shapes: Record<string,string> = {
 search:'M21 21l-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',
 bookmark:'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z',
 info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 play:'m9 7 8 5-8 5V7ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 plus:'M12 5v14M5 12h14',
 trash:'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M10 10v7M14 10v7',
 calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 14h2M14 14h2M8 18h2',
 photo:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 17l6-6 4 4 3-3 5 5M16 7h.01',
 edit:'m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z',
};
export default function MenuActionIcon({name,size=20,...props}:SVGProps<SVGSVGElement>&{name:string;size?:number}){
 return <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={shapes[name]||shapes.info}/></svg>;
}
