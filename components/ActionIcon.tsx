import type { SVGProps } from 'react';
const paths: Record<string,string> = {
 '검색':'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
 '닫기':'M6 6l12 12M18 6 6 18',
 '삭제':'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
 '저장':'M6 21V3h12v18l-6-4Z',
 '공유':'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 11l6-5M9 13l6 5',
 '수정':'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z',
 '복사':'M9 9h12v12H9ZM15 9V3H3v12h6',
 '새로고침':'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
};
export default function ActionIcon({ label, ...props }: SVGProps<SVGSVGElement> & {label:string}) {
 return <svg {...props} className="wave-action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[label]}/></svg>;
}
